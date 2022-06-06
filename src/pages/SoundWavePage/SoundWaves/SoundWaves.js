import PropTypes from "prop-types";

import "./SoundWaves.scss";

export const SoundWaves = ({ numberOfWaves, size = 300 }) => {
    const containerStyles = {
        width: `${size}px`,
        height: `${size}px`,
    };

    return (
        <div style={containerStyles} className="sound-waves">
            {[...Array(numberOfWaves)].map((_element, index) => {
                const waveSize = size / (2 * numberOfWaves) * index;
                const waveStyles = {
                    top: `${waveSize}px`,
                    left: `${waveSize}px`,
                    right: `${waveSize}px`,
                    bottom: `${waveSize}px`,
                    animationDelay: `${(numberOfWaves - 1 - index) * 0.1}s`
                };

                return (
                    <span
                        key={`${numberOfWaves}-${index}`}
                        style={waveStyles}
                        className="sound-waves__wave"
                    />
                );
            })}
        </div>
    );
};

SoundWaves.propTypes = {
    numberOfWaves: PropTypes.number,
    size: PropTypes.number,
};
