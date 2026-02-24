const parseSseMessage = (chunk = "") => {
    const lines = String(chunk).split("\n");
    let event = "message";
    const dataLines = [];

    lines.forEach((line) => {
        if (line.startsWith("event:")) {
            event = line.slice("event:".length).trim();
            return;
        }
        if (line.startsWith("data:")) {
            dataLines.push(line.slice("data:".length).trim());
        }
    });

    if (dataLines.length === 0) {
        return null;
    }

    let payload = null;
    try {
        payload = JSON.parse(dataLines.join("\n"));
    } catch (error) {
        payload = null;
    }

    return { event, payload };
};

export const consumeSse = async (response, handlers = {}, signal) => {
    if (!response?.body) {
        throw new Error("Streaming response body is unavailable.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
        if (signal?.aborted) {
            await reader.cancel();
            throw new DOMException("Stream aborted", "AbortError");
        }

        const { done, value } = await reader.read();
        if (done) {
            break;
        }

        buffer += decoder.decode(value, { stream: true });
        const messages = buffer.split("\n\n");
        buffer = messages.pop() || "";

        messages.forEach((rawMessage) => {
            const parsed = parseSseMessage(rawMessage);
            if (!parsed) {
                return;
            }
            handlers?.onEvent?.(parsed.event, parsed.payload || {});
        });
    }

    if (buffer.trim()) {
        const parsed = parseSseMessage(buffer);
        if (parsed) {
            handlers?.onEvent?.(parsed.event, parsed.payload || {});
        }
    }
};

