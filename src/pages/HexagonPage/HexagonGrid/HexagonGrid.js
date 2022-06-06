import PropTypes from "prop-types";

import { Hexagon } from "./Hexagon/Hexagon";

import "./HexagonGrid.scss";

export const HexagonGrid = ({
    horizontal,
    outline,
    flashlight,
    rows,
    columns,
}) => {
    return (
        <div className="hexagon-grid">
            {[...Array(rows)].map((_row, rIndex) => (
                <div key={rIndex} className="hexagon-grid__row">
                    {[...Array(columns)].map((_column, cIndex) => (
                        <Hexagon
                            key={cIndex}
                            outline={outline}
                            flashlight={flashlight}
                            horizontal={horizontal}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
};

HexagonGrid.propTypes = {
    horizontal: PropTypes.bool,
    outline: PropTypes.bool,
    flashlight: PropTypes.bool,
    rows: PropTypes.number,
    columns: PropTypes.number,
};
