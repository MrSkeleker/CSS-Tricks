import { Card } from "components/Card/Card";
import PropTypes from "prop-types";
import "./GalleryCard.scss";

export const GalleryCard = ({ title, image, description }) => {
    const { staticSource, gifSource, alt } = image;

    return (
        <Card>
            <div className="galleryCard__header">
                <img
                    className="galleryCard__static"
                    src={staticSource}
                    alt={alt}
                />
                <img className="galleryCard__gif" src={gifSource} alt={alt} />
            </div>
            <div className="galleryCard__body">
                <h3 className="galleryCard__title">{title}</h3>
                <p className="galleryCard__description">{description}</p>
            </div>
        </Card>
    );
};

GalleryCard.propTypes = {
    title: PropTypes.string,
    image: PropTypes.object,
    description: PropTypes.string,
};
