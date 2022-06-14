import PropTypes from "prop-types";
import { classNames } from "utils/styles";

import "./ScrollingText.scss";

export const ScrollingText = ({ customStyles, customClass, text }) => (
    <p
        style={customStyles}
        className={classNames(["scrolling-text", customClass])}
    >
        {text}
    </p>
);

ScrollingText.propTypes = {
    text: PropTypes.string,
    customStyles: PropTypes.object,
    customClass: PropTypes.string,
};
