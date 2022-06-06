import { useEffect, useState } from "react";
import PropTypes from "prop-types";

import { classNames } from "utils/styles";
import { FaRedoAlt } from "react-icons/fa";

import "./SwitchButton.scss";


export const SwitchButton = ({ label, status, setStatus, disabled }) => {
    const [spin, setSpin] = useState(false);
    const buttonClasses = ["switch-button", { "switch-button--active": status }];
    const iconClasses = ["switch-button__icon", {"switch-button__icon--spin": spin}]

    const toggleStatus = () => {
        setStatus(prevStatus => !prevStatus);
        setSpin(true);
    }

    useEffect(() => {
        if(spin) {  
            setTimeout(() => setSpin(false), 500);
        }
    }, [spin])

    return (
        <button disabled={disabled} className={classNames(buttonClasses)} onClick={toggleStatus}>
            {label}
            <FaRedoAlt className={classNames(iconClasses)} />
        </button>
    );
};

SwitchButton.propTypes = {
    label: PropTypes.string.isRequired,
    status: PropTypes.bool.isRequired,
    setStatus: PropTypes.func.isRequired,
};
