import PropTypes from "prop-types";

import { Cursor } from "components/Cursor/Cursor";

import "./FlashlightCursor.scss";

export const FlashlightCursor = ({ size = "400px" }) => {
    const styles = {
        width: size,
        height: size,
    };

    return (
        <Cursor>
            <div style={styles} className="flashlight-cursor"></div>
        </Cursor>
    );
};

FlashlightCursor.propTypes = {
    size: PropTypes.string,
};
