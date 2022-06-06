import { useState } from "react";

import { Header } from "components/Header/Header";
import { PAGES } from "utils/pages";
import { SoundWaves } from "./SoundWaves/SoundWaves";
import { Footer } from "components/Footer/Footer";
import { RangeSlider } from "components/RangeSlider/RangeSlider";

import "./SoundWavePage.scss";

const NUMBER_OF_WAVES = 10;
const MIN_NUMBER_OF_WAVES = 1;
const MAX_NUMBER_OF_WAVES = 20;

export const SoundWavePage = () => {
    const [numberOfWaves, setNumberOfWaves] = useState(NUMBER_OF_WAVES);
    const handleChange = (value) => setNumberOfWaves(parseInt(value));

    return (
        <div id="sound-wave-page">
            <Header title={PAGES.SOUNDWAVE_PAGE.TITLE} />
            <main>
                <SoundWaves numberOfWaves={numberOfWaves} />
            </main>
            <Footer>
                <RangeSlider
                    min={MIN_NUMBER_OF_WAVES}
                    max={MAX_NUMBER_OF_WAVES}
                    initialValue={NUMBER_OF_WAVES}
                    withTooltip
                    onChange={handleChange}
                />
            </Footer>
        </div>
    );
};
