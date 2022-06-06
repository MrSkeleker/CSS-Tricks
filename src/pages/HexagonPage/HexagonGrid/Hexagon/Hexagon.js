import PropTypes from "prop-types";

import { classNames } from "utils/styles";

import "./Hexagon.scss";

export const Hexagon = ({ horizontal, outline, flashlight }) => {
    const classes = [
        "hexagon",
        {
            "hexagon--horizontal": horizontal,
            "hexagon--outline": outline,
            "hexagon--flashlight": flashlight,
        },
    ];

    return (
        <div className="hexagon-wrapper">
            <div className={classNames(classes)} />
        </div>
    );
};

Hexagon.propTypes = {
    horizontal: PropTypes.bool,
    outline: PropTypes.bool,
    flashlight: PropTypes.bool,
};
