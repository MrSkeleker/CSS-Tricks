import { useState } from "react";

import { Header } from "components/Header/Header";
import { PAGES } from "utils/pages";
import { HexagonGrid } from "./HexagonGrid/HexagonGrid";
import { Footer } from "components/Footer/Footer";
import { SwitchButton } from "components/SwitchButton/SwitchButton";

import "./HexagonPage.scss";
import { FlashlightCursor } from "./FlashlightCursor/FlashlightCursor";

const GRID_ROWS = 13;
const GRID_COLUMNS = 16;
const FLASHLIGHT_SIZE = '500px';

export const HexagonPage = () => {
    const [outline, setOutline] = useState(false);
    const [flashlight, setFlashlight] = useState(false);

    return (
        <div id="hexagon-page">
            <Header title={PAGES.HEXAGON_PAGE.TITLE} />
            <HexagonGrid
                outline={outline}
                flashlight={flashlight}
                rows={GRID_ROWS}
                columns={GRID_COLUMNS}
            />
            {flashlight && <FlashlightCursor size={FLASHLIGHT_SIZE}/>}
            <Footer>
                <SwitchButton
                    label="outline"
                    status={outline}
                    setStatus={setOutline}
                    disabled={flashlight}
                />
                <SwitchButton
                    label="flashlight"
                    status={flashlight}
                    setStatus={setFlashlight}
                />
            </Footer>
        </div>
    );
};
