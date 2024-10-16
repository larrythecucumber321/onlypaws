import Image from "next/image";

interface PawImageProps {
  image: {
    id: number;
    name: string;
    price: string;
    image_url: string;
  };
  onClick?: () => void;
  purchased?: boolean;
}

export function PawImage({ image, onClick, purchased }: PawImageProps) {
  return (
    <div className="relative cursor-pointer" onClick={onClick}>
      <Image
        src={image.image_url}
        alt={image.name}
        width={200}
        height={200}
        className={`rounded-lg ${!purchased && "filter blur-sm"}`}
      />
      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2">
        <p>{image.name}</p>
        <p>{image.price} BERA</p>
      </div>
    </div>
  );
}
