export const BUTTON_VARIANTS = {
    PRIMARY: "primary",
    SECONDARY: "secondary",
    TERNARY: "ternary",
};

export const classNames = classNames => {
    return classNames
        .map(className => {
            if (typeof className === "object") {
                const keys = Object.keys(className);
                return keys.filter(key => className[key]).join(" ");
            }
            return className;
        })
        .filter(className => className)
        .join(" ");
};
