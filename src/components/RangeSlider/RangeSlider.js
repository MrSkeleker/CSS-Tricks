import PropTypes from "prop-types";
import { useState } from "react";

import "./RangeSlider.scss";

export const RangeSlider = ({
    withTooltip,
    min,
    max,
    initialValue,
    onChange,
}) => {
    const [sliderValue, setSliderValue] = useState(initialValue);
    const handleChange = event => {
        setSliderValue(event.target.value);
        onChange(event.target.value);
    };

    return (
        <div className="range-slider">
            <div className="range-slider__slider-wrapper">
                <input
                    id="typeinp"
                    className="range-slider__slider"
                    type="range"
                    min={min}
                    max={max}
                    value={sliderValue}
                    onChange={handleChange}
                />
            </div>
            <div className="range-slider__legend">
                <span>{min}</span>
                {withTooltip && (
                    <span className="range-slider__tooltip">{sliderValue}</span>
                )}
                <span>{max}</span>
            </div>
        </div>
    );
};

RangeSlider.propTypes = {
    min: PropTypes.number,
    max: PropTypes.number,
    onChange: PropTypes.func,
    withTooltip: PropTypes.bool,
    initialValue: PropTypes.number,
};
