import React, { useEffect, useMemo, useRef, useState } from "react";
import { AgentClient } from "agents/client";
import AISuggestionList from "./AISuggestionList";

const CHAT_MESSAGE_TYPES = {
    clear: "cf_agent_chat_clear",
    messages: "cf_agent_chat_messages",
    request: "cf_agent_use_chat_request",
    response: "cf_agent_use_chat_response"
};

const getMessageText = (message = {}) =>
    (message.parts || [])
        .map((part) => {
            if (part.type === "text") {
                return part.text;
            }

            return "";
        })
        .filter(Boolean)
        .join("\n")
        .trim();

const buildInitialState = (cvData, jobDescription) => ({
    cvData,
    jobDescription: jobDescription || "",
    suggestions: [],
    lastContextUpdatedAt: null
});

const createUserMessage = (text) => ({
    id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
    role: "user",
    parts: [{ type: "text", text }]
});

const createAssistantMessage = (requestId) => ({
    id: `assistant_${requestId}`,
    role: "assistant",
    parts: []
});

const upsertAssistantPlainText = (currentMessages, requestId, textChunk) => {
    const nextMessages = currentMessages.map((message) => ({
        ...message,
        parts: Array.isArray(message.parts) ? [...message.parts] : []
    }));
    const existingIndex = nextMessages.findIndex(
        (message) => message.id === `assistant_${requestId}`
    );
    const assistantMessage =
        existingIndex >= 0
            ? nextMessages[existingIndex]
            : createAssistantMessage(requestId);

    const nextText = String(textChunk || "");
    const textPart = findLastTextPart(assistantMessage.parts);
    if (textPart) {
        textPart.text += nextText;
    } else {
        assistantMessage.parts.push({ type: "text", text: nextText });
    }

    if (existingIndex >= 0) {
        nextMessages[existingIndex] = assistantMessage;
    } else {
        nextMessages.push(assistantMessage);
    }

    return nextMessages;
};

const findLastTextPart = (parts = []) => {
    for (let index = parts.length - 1; index >= 0; index -= 1) {
        if (parts[index]?.type === "text") {
            return parts[index];
        }
    }

    return null;
};

const applyChunkToAssistantMessage = (message, chunk) => {
    if (!message || !chunk || typeof chunk !== "object") {
        return;
    }

    switch (chunk.type) {
        case "text-start":
            message.parts.push({ type: "text", text: "" });
            break;
        case "text-delta": {
            const textPart = findLastTextPart(message.parts);
            if (textPart) {
                textPart.text += chunk.delta || "";
            } else {
                message.parts.push({ type: "text", text: chunk.delta || "" });
            }
            break;
        }
        case "text-end":
            break;
        default:
            break;
    }
};

const buildStatusLabel = (connectionState, requestStatus) => {
    if (requestStatus === "in_progress") {
        return "Thinking...";
    }

    if (connectionState === "connecting") {
        return "Connecting";
    }

    if (connectionState === "connected") {
        return "Connected";
    }

    return "Offline";
};

const clearAssistantHistoryState = (cvData, jobDescription) => ({
    cvData,
    jobDescription: jobDescription || "",
    suggestions: [],
    lastContextUpdatedAt: new Date().toISOString()
});

const ConnectedJobAssistantPanel = ({
    userId,
    cvData,
    jobDescription,
    onJobDescriptionChange,
    onApplySuggestion,
    agentHost
}) => {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState([]);
    const [assistantState, setAssistantState] = useState(buildInitialState(cvData, jobDescription));
    const [panelError, setPanelError] = useState("");
    const [connectionState, setConnectionState] = useState("connecting");
    const [requestStatus, setRequestStatus] = useState("idle");
    const syncSignature = useMemo(
        () => JSON.stringify({ cvData, jobDescription: jobDescription || "" }),
        [cvData, jobDescription]
    );
    const lastSyncedSignature = useRef("");
    const clientRef = useRef(null);
    const activeRequestIdRef = useRef("");

    useEffect(() => {
        const client = new AgentClient({
            agent: "job-assistant",
            name: userId,
            host: agentHost
        });

        clientRef.current = client;
        setConnectionState("connecting");
        setPanelError("");

        const handleOpen = () => {
            setConnectionState("connected");
        };

        const handleClose = () => {
            setConnectionState("offline");
            setRequestStatus("idle");
        };

        const handleError = () => {
            setConnectionState("offline");
            setPanelError("Assistant connection failed.");
            setRequestStatus("idle");
        };

        const hydrateSnapshot = async () => {
            try {
                await client.ready;
                const snapshot = await client.call("getChatSnapshot");
                if (snapshot?.state) {
                    handleStateUpdate(snapshot.state);
                }
                if (Array.isArray(snapshot?.messages)) {
                    setMessages(snapshot.messages);
                }
            } catch (error) {
                setPanelError(error.message || "Failed to load assistant history.");
                setConnectionState("offline");
            }
        };

        const handleMessage = (event) => {
            if (typeof event.data !== "string") {
                return;
            }

            let payload;
            try {
                payload = JSON.parse(event.data);
            } catch (_error) {
                return;
            }

            if (payload.type === CHAT_MESSAGE_TYPES.messages) {
                setMessages(Array.isArray(payload.messages) ? payload.messages : []);
                return;
            }

            if (payload.type === CHAT_MESSAGE_TYPES.clear) {
                setMessages([]);
                setRequestStatus("idle");
                return;
            }

            if (payload.type !== CHAT_MESSAGE_TYPES.response) {
                return;
            }

            if (payload.error) {
                setPanelError(payload.body || "Assistant response failed.");
                setRequestStatus("idle");
                activeRequestIdRef.current = "";
                return;
            }

            if (payload.id !== activeRequestIdRef.current) {
                return;
            }

            if (payload.body) {
                try {
                    const chunk = JSON.parse(payload.body);
                    setMessages((currentMessages) => {
                        const nextMessages = currentMessages.map((message) => ({
                            ...message,
                            parts: Array.isArray(message.parts) ? [...message.parts] : []
                        }));
                        const existingIndex = nextMessages.findIndex(
                            (message) => message.id === `assistant_${payload.id}`
                        );
                        const assistantMessage =
                            existingIndex >= 0
                                ? nextMessages[existingIndex]
                                : createAssistantMessage(payload.id);

                        applyChunkToAssistantMessage(assistantMessage, chunk);

                        if (existingIndex >= 0) {
                            nextMessages[existingIndex] = assistantMessage;
                        } else {
                            nextMessages.push(assistantMessage);
                        }

                        return nextMessages;
                    });
                } catch (_error) {
                    setMessages((currentMessages) =>
                        upsertAssistantPlainText(currentMessages, payload.id, payload.body)
                    );
                }
            }

            if (payload.done) {
                setRequestStatus("idle");
                activeRequestIdRef.current = "";
                void hydrateSnapshot();
            }
        };

        const handleStateUpdate = (nextState) => {
            if (!nextState || typeof nextState !== "object") {
                return;
            }

            lastSyncedSignature.current = JSON.stringify({
                cvData: nextState.cvData || {},
                jobDescription: nextState.jobDescription || ""
            });
            setAssistantState((prev) => ({
                ...prev,
                ...nextState
            }));
        };

        client.addEventListener("open", handleOpen);
        client.addEventListener("close", handleClose);
        client.addEventListener("error", handleError);
        client.addEventListener("message", handleMessage);
        client.options.onStateUpdate = handleStateUpdate;

        hydrateSnapshot();

        return () => {
            activeRequestIdRef.current = "";
            client.removeEventListener("open", handleOpen);
            client.removeEventListener("close", handleClose);
            client.removeEventListener("error", handleError);
            client.removeEventListener("message", handleMessage);
            client.close();
            clientRef.current = null;
        };
    }, [agentHost, userId]);

    useEffect(() => {
        const client = clientRef.current;
        if (!client) {
            return;
        }

        if (syncSignature === lastSyncedSignature.current) {
            return;
        }

        const nextState = {
            ...(assistantState || buildInitialState(cvData, jobDescription)),
            cvData,
            jobDescription: jobDescription || ""
        };

        lastSyncedSignature.current = syncSignature;
        client.setState(nextState);
        setAssistantState(nextState);
    }, [assistantState, cvData, jobDescription, syncSignature]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        const nextInput = input.trim();
        const client = clientRef.current;

        if (!nextInput || !client) {
            return;
        }

        const nextMessages = [...messages, createUserMessage(nextInput)];
        const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

        setPanelError("");
        setInput("");
        setMessages(nextMessages);
        setRequestStatus("in_progress");
        activeRequestIdRef.current = requestId;

        try {
            client.send(
                JSON.stringify({
                    type: CHAT_MESSAGE_TYPES.request,
                    id: requestId,
                    init: {
                        method: "POST",
                        body: JSON.stringify({ messages: nextMessages })
                    }
                })
            );
        } catch (error) {
            activeRequestIdRef.current = "";
            setRequestStatus("idle");
            setPanelError(error.message || "Failed to send message.");
        }
    };

    const updateSuggestions = (nextSuggestions) => {
        const client = clientRef.current;
        const nextState = {
            ...(assistantState || buildInitialState(cvData, jobDescription)),
            suggestions: nextSuggestions,
            cvData,
            jobDescription: jobDescription || ""
        };

        setAssistantState(nextState);
        if (client) {
            client.setState(nextState);
        }
    };

    const handleAcceptSuggestion = (suggestion) => {
        const result = onApplySuggestion ? onApplySuggestion(suggestion) : { ok: true };
        if (!result?.ok) {
            setPanelError(result?.error || "Failed to apply suggestion.");
            return;
        }

        const nextSuggestions = (assistantState?.suggestions || []).map((item) =>
            item.id === suggestion.id ? { ...item, status: "accepted" } : item
        );
        updateSuggestions(nextSuggestions);
    };

    const handleDismissSuggestion = (suggestion) => {
        const nextSuggestions = (assistantState?.suggestions || []).map((item) =>
            item.id === suggestion.id ? { ...item, status: "dismissed" } : item
        );
        updateSuggestions(nextSuggestions);
    };

    const handleClearChat = () => {
        const client = clientRef.current;
        const nextState = clearAssistantHistoryState(cvData, jobDescription);

        activeRequestIdRef.current = "";
        setMessages([]);
        setPanelError("");
        setRequestStatus("idle");
        setAssistantState(nextState);
        lastSyncedSignature.current = JSON.stringify({
            cvData,
            jobDescription: jobDescription || ""
        });

        if (client) {
            client.setState(nextState);
            client.send(
                JSON.stringify({
                    type: CHAT_MESSAGE_TYPES.clear
                })
            );
        }
    };

    return (
        <section className="job-assistant-panel glass-sheet" aria-label="Job assistant panel">
            <div className="ai-panel-header">
                <div>
                    <h2>Job Assistant</h2>
                    <p>Stateful chat that keeps your CV context and proposes targeted edits.</p>
                </div>
                <div className="assistant-panel-actions">
                    <button
                        type="button"
                        className="secondary-btn"
                        onClick={handleClearChat}
                        disabled={connectionState !== "connected" && messages.length === 0}
                    >
                        Clear Chat
                    </button>
                    <div className="assistant-status-pill">{buildStatusLabel(connectionState, requestStatus)}</div>
                </div>
            </div>

            <div className="ai-job-match-wrap">
                <label htmlFor="assistant-job-description" className="form-label">Target Job Description</label>
                <textarea
                    id="assistant-job-description"
                    value={jobDescription || ""}
                    onChange={(event) => onJobDescriptionChange && onJobDescriptionChange(event.target.value)}
                    placeholder="Paste a target job description to guide the assistant..."
                    rows={5}
                    className="form-textarea"
                />
            </div>

            {panelError ? <div className="form-error">{panelError}</div> : null}

            <div className="assistant-chat-log">
                {messages.length === 0 ? (
                    <div className="assistant-empty-state">
                        Ask for tailored rewrites, missing keywords, or how to strengthen a section for a target role.
                    </div>
                ) : (
                    messages.map((message) => {
                        const text = getMessageText(message);
                        if (!text) {
                            return null;
                        }

                        return (
                            <article key={message.id} className={`assistant-message ${message.role}`}>
                                <span className="assistant-message-role">
                                    {message.role === "user" ? "You" : "Assistant"}
                                </span>
                                <p>{text}</p>
                            </article>
                        );
                    })
                )}
            </div>

            <form className="assistant-composer" onSubmit={handleSubmit}>
                <label htmlFor="assistant-input" className="form-label">Chat</label>
                <div className="assistant-input-row">
                    <textarea
                        id="assistant-input"
                        value={input}
                        onChange={(event) => setInput(event.target.value)}
                        placeholder="Ask how to tailor this CV for a role, or request concrete edits..."
                        rows={3}
                        className="form-textarea assistant-input"
                    />
                    <button
                        type="submit"
                        className="primary-btn"
                        disabled={requestStatus === "in_progress" || connectionState !== "connected"}
                    >
                        {requestStatus === "in_progress" ? "Thinking..." : "Send"}
                    </button>
                </div>
            </form>

            <div className="assistant-suggestions-block">
                <div className="assistant-suggestions-head">
                    <h3>Suggested Patches</h3>
                    <span>{(assistantState?.suggestions || []).length} saved</span>
                </div>
                <AISuggestionList
                    suggestions={assistantState?.suggestions || []}
                    onAccept={handleAcceptSuggestion}
                    onDismiss={handleDismissSuggestion}
                    emptyLabel="The assistant has not proposed any concrete CV patches yet."
                />
            </div>
        </section>
    );
};

const JobAssistantPanel = (props) => {
    if (!String(props.userId || "").trim()) {
        return (
            <section className="job-assistant-panel glass-sheet" aria-label="Job assistant panel">
                <div className="ai-panel-header">
                    <div>
                        <h2>Job Assistant</h2>
                        <p>Stateful chat and patch suggestions unlock after you set a user ID.</p>
                    </div>
                </div>
                <div className="assistant-disabled-state">
                    Enter a user ID in the Save / Load section before starting the assistant. That ID is used for
                    chat memory and Durable Object storage.
                </div>
            </section>
        );
    }

    return <ConnectedJobAssistantPanel {...props} />;
};

export default JobAssistantPanel;
