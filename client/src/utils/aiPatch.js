const PATH_TOKEN_PATTERN = /([^[.\]]+)|\[(\d+)\]/g;

const toPathTokens = (fieldPath = "") => {
    const tokens = [];
    PATH_TOKEN_PATTERN.lastIndex = 0;
    let match = PATH_TOKEN_PATTERN.exec(fieldPath);

    while (match) {
        if (typeof match[1] === "string") {
            tokens.push(match[1]);
        } else if (typeof match[2] === "string") {
            tokens.push(Number(match[2]));
        }
        match = PATH_TOKEN_PATTERN.exec(fieldPath);
    }

    return tokens;
};

const cloneNode = (value) => {
    if (Array.isArray(value)) {
        return value.slice();
    }
    if (value && typeof value === "object") {
        return { ...value };
    }
    return value;
};

const resolveLeaf = (target, tokens) => {
    let cursor = target;
    for (let index = 0; index < tokens.length; index += 1) {
        const token = tokens[index];
        if (cursor === null || cursor === undefined) {
            return { ok: false, error: "Path does not exist." };
        }

        if (typeof token === "number") {
            if (!Array.isArray(cursor) || token < 0 || token >= cursor.length) {
                return { ok: false, error: "Array index is out of bounds." };
            }
            cursor = cursor[token];
        } else {
            if (!(token in cursor)) {
                return { ok: false, error: "Path does not exist." };
            }
            cursor = cursor[token];
        }
    }

    return { ok: true, value: cursor };
};

export const applySuggestionPatch = (cvData, fieldPath, suggestedText) => {
    if (!cvData || typeof cvData !== "object") {
        return { ok: false, error: "Invalid cvData payload." };
    }

    if (typeof fieldPath !== "string" || !fieldPath.trim()) {
        return { ok: false, error: "Invalid fieldPath." };
    }

    if (typeof suggestedText !== "string") {
        return { ok: false, error: "Suggested text must be a string." };
    }

    const tokens = toPathTokens(fieldPath.trim());
    if (tokens.length === 0) {
        return { ok: false, error: "Unable to parse fieldPath." };
    }

    const leafResult = resolveLeaf(cvData, tokens);
    if (!leafResult.ok) {
        return leafResult;
    }

    if (typeof leafResult.value !== "string") {
        return { ok: false, error: "Only string fields can be patched." };
    }

    const nextData = cloneNode(cvData);
    let cursor = nextData;

    for (let index = 0; index < tokens.length - 1; index += 1) {
        const token = tokens[index];
        const currentValue = cursor[token];
        const cloned = cloneNode(currentValue);
        cursor[token] = cloned;
        cursor = cursor[token];
    }

    const finalToken = tokens[tokens.length - 1];
    cursor[finalToken] = suggestedText;

    return {
        ok: true,
        data: nextData
    };
};

export const parseSuggestionFieldPath = (fieldPath) => toPathTokens(fieldPath);
