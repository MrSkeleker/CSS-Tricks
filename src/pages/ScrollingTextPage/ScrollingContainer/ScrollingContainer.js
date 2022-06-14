import PropTypes from "prop-types";

import { classNames } from "utils/styles";
import { ScrollingText } from "./ScrollingText/ScrollingText";

import "./ScrollingContainer.scss";

export const ScrollingContainer = ({ text, position, divisions }) => {
    const styles = {
        left: `${(divisions - position) * 100}%`,
    };

    const containerClasses = classNames([
        "scrolling-container",
        { "scrolling-container--even": position % 2 },
    ]);

    return (
        <div className={containerClasses}>
            <ScrollingText text={text} customStyles={styles} />
        </div>
    );
};

ScrollingContainer.propTypes = {
    text: PropTypes.string,
    position: PropTypes.number,
    divisions: PropTypes.number,
};
