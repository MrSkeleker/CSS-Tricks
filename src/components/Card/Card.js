import PropTypes from "prop-types";

import "./Card.scss";

export const Card = ({ children }) => (
    <div className="card">
        {children}
    </div>
);

Card.propTypes = {
    children: PropTypes.node,
};
