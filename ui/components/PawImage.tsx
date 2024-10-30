"use client";

interface PawImageProps {
  image: {
    id: string;
    name: string;
    price: string;
    image_url: string;
  };
  onClick?: () => void;
  purchased?: boolean;
  isInGallery?: boolean;
}

export function PawImage({
  image,
  onClick,
  purchased = false,
  isInGallery = false,
}: PawImageProps) {
  return (
    <div
      className="relative group rounded-lg overflow-hidden bg-background shadow-md"
      onClick={onClick}
    >
      <div className="aspect-square relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.image_url}
          alt={image.name}
          className={`object-cover w-full h-full ${!isInGallery && "blur-md"}`}
          style={{
            WebkitUserSelect: isInGallery ? "auto" : "none",
            userSelect: isInGallery ? "auto" : "none",
            WebkitTouchCallout: isInGallery ? "default" : "none",
          }}
          onContextMenu={(e) => {
            if (!isInGallery) {
              e.preventDefault();
            }
          }}
        />
      </div>
      <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
        <div className="flex justify-between items-center">
          <span className="text-white font-medium">{image.name}</span>
          {!isInGallery && (
            <span className="text-white font-bold">{image.price} BERA</span>
          )}
        </div>
      </div>
      {!isInGallery && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-lg">
            Purchase to View
          </span>
        </div>
      )}
    </div>
  );
}
