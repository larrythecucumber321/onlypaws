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
}

export function PawImage({ image, onClick, purchased }: PawImageProps) {
  return (
    <div className="relative cursor-pointer" onClick={onClick}>
      <img
        src={image.image_url}
        alt={image.name}
        className={`rounded-lg w-[300px] h-[300px] object-cover ${
          !purchased && "hover:opacity-75 transition-opacity"
        }`}
      />
      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2 rounded-b-lg">
        <p className="font-semibold">{image.name}</p>
        <p className="text-sm">{image.price} BERA</p>
      </div>
    </div>
  );
}
