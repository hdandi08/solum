import { useState } from 'react';
import './ProductPhotoSwitcher.css';

// A small, reusable alternative to a carousel for product views.
export default function ProductPhotoSwitcher({ images, label, caption }) {
  const [active, setActive] = useState(0);
  const photo = images[active];
  return (
    <figure className="product-photo-switcher">
      <div className="product-photo-switcher-image">
        <img src={photo.src} srcSet={photo.srcSet} sizes="(max-width: 768px) 100vw, 50vw" alt={photo.alt} width={photo.width} height={photo.height} loading="lazy" />
      </div>
      <div className="product-photo-switcher-controls" role="group" aria-label={label}>
        {images.map((image, index) => (
          <button type="button" key={image.src} aria-pressed={active === index} onClick={() => setActive(index)}>{image.label}</button>
        ))}
      </div>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}
