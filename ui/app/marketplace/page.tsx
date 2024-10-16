import { Marketplace } from "../../components/Marketplace";
import { UploadImage } from "../../components/UploadImage";

export default function MarketplacePage() {
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Marketplace</h1>
      <UploadImage />
      <Marketplace />
    </div>
  );
}
