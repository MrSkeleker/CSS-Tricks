import PropTypes from "prop-types";
import { GalleryCard } from "./GalleryCard/GalleryCard";

import "./Gallery.scss";


export const Gallery = ({ items }) => (
    <div className="gallery">
        {items.map(({ id, ...item }) => (
            <GalleryCard key={id} {...item} />
        ))}
    </div>
);

Gallery.propTypes = {
    items: PropTypes.array,
};
