const tokenize = (value = "") =>
    String(value)
        .trim()
        .split(/\s+/)
        .filter(Boolean);

const buildLcsMatrix = (leftTokens, rightTokens) => {
    const rows = leftTokens.length + 1;
    const cols = rightTokens.length + 1;
    const matrix = Array.from({ length: rows }, () => Array(cols).fill(0));

    for (let leftIndex = 1; leftIndex < rows; leftIndex += 1) {
        for (let rightIndex = 1; rightIndex < cols; rightIndex += 1) {
            if (leftTokens[leftIndex - 1] === rightTokens[rightIndex - 1]) {
                matrix[leftIndex][rightIndex] = matrix[leftIndex - 1][rightIndex - 1] + 1;
            } else {
                matrix[leftIndex][rightIndex] = Math.max(
                    matrix[leftIndex - 1][rightIndex],
                    matrix[leftIndex][rightIndex - 1]
                );
            }
        }
    }

    return matrix;
};

const backtrackLcs = (matrix, leftTokens, rightTokens) => {
    const segments = [];
    let leftIndex = leftTokens.length;
    let rightIndex = rightTokens.length;

    while (leftIndex > 0 || rightIndex > 0) {
        if (leftIndex > 0 && rightIndex > 0 && leftTokens[leftIndex - 1] === rightTokens[rightIndex - 1]) {
            segments.push({ type: "same", text: leftTokens[leftIndex - 1] });
            leftIndex -= 1;
            rightIndex -= 1;
            continue;
        }

        if (rightIndex > 0 && (leftIndex === 0 || matrix[leftIndex][rightIndex - 1] >= matrix[leftIndex - 1][rightIndex])) {
            segments.push({ type: "add", text: rightTokens[rightIndex - 1] });
            rightIndex -= 1;
            continue;
        }

        if (leftIndex > 0) {
            segments.push({ type: "remove", text: leftTokens[leftIndex - 1] });
            leftIndex -= 1;
        }
    }

    return segments.reverse();
};

export const getWordDiffSegments = (originalText = "", suggestedText = "") => {
    const leftTokens = tokenize(originalText);
    const rightTokens = tokenize(suggestedText);

    if (leftTokens.length === 0 && rightTokens.length === 0) {
        return [];
    }

    if (leftTokens.length === 0) {
        return rightTokens.map((text) => ({ type: "add", text }));
    }

    if (rightTokens.length === 0) {
        return leftTokens.map((text) => ({ type: "remove", text }));
    }

    const matrix = buildLcsMatrix(leftTokens, rightTokens);
    return backtrackLcs(matrix, leftTokens, rightTokens);
};

