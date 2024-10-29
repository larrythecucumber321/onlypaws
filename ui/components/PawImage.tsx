import Image from "next/image";

interface PawImageProps {
  image: {
    id: string;
    name: string;
    price: string;
    image_url: string;
    owner: string;
  };
  onClick?: () => void;
  purchased?: boolean;
  isInGallery?: boolean;
}

export function PawImage({
  image,
  onClick,
  purchased,
  isInGallery,
}: PawImageProps) {
  return (
    <div
      className="relative cursor-pointer"
      onClick={onClick}
      onContextMenu={(e) => e.preventDefault()} // Prevent right-click
    >
      <div className="relative">
        <img
          src={image.image_url}
          alt={image.name}
          className={`rounded-lg w-[300px] h-[300px] object-cover select-none ${
            !isInGallery && "filter blur-sm"
          } ${!purchased && "hover:opacity-75 transition-opacity"}`}
          draggable="false"
        />
        {!isInGallery && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white text-lg font-bold bg-black bg-opacity-50 px-4 py-2 rounded">
              Purchase to View
            </span>
          </div>
        )}
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 rounded-b-lg">
        <p className="font-semibold">{image.name}</p>
        <p className="text-sm">{image.price} BERA</p>
      </div>
    </div>
  );
}
