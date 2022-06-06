import PropTypes from "prop-types";
import { useEffect, useState } from "react";

import "./Cursor.scss";

const MOUSE_MOVE_EVENT = 'mousemove';
const INITIAL_STATE = {
    left: 0,
    top: 0
}

export const Cursor = ({children}) => {
    const [cursor, setCursor] = useState(INITIAL_STATE);
    const {left, top} = cursor;

    const styles = {
        left,
        top
    }

    useEffect(() => {
        document.addEventListener(MOUSE_MOVE_EVENT, (e) => {
            const {pageX, pageY} = e;

            setCursor({
                left: pageX,
                top: pageY
            })
        })
    }, []);

    return <div style={styles} className="cursor">
        {children}
    </div>;
};

Cursor.propTypes = {
    size: PropTypes.string,
    children: PropTypes.node,
};
