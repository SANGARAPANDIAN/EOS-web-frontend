import { Card, Icon } from "@/components/ui";
import type { StationeryProduct } from "@/modules/student/api/stationeryStore";

function initialsFromName(name: string): string {
  const words = name.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w));
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/** One product tile — shared by the Home screen's category rows, its search results, and the Category page's own grid (same card, matching the mobile app's ProductCard reused across the same three call sites). */
export function ProductTile({
  product,
  quantity,
  onAdd,
  onRemove,
}: {
  product: StationeryProduct;
  quantity: number;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const outOfStock = product.stock_quantity <= 0;
  const stockLabel = outOfStock ? "Out of stock" : product.stock_quantity <= 10 ? `Only ${product.stock_quantity} left` : "In stock";
  const stockColor = outOfStock ? "text-danger-fg" : product.stock_quantity <= 10 ? "text-amber-600" : "text-emerald-600";

  return (
    <Card className="flex flex-col gap-2 overflow-hidden p-0">
      <div className="flex h-20 items-center justify-center bg-surface-tint">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- a remote catalogue image, not a local/optimizable asset
          <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-lg font-bold text-subtle">{initialsFromName(product.name)}</span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-2.5">
        <p className="min-h-[32px] text-[12.5px] font-semibold text-ink">{product.name}</p>
        <div className="flex items-baseline justify-between gap-1">
          <span className="text-sm font-bold text-ink">₹{product.price}</span>
          <span className={`text-[9.5px] font-semibold ${stockColor}`}>{stockLabel}</span>
        </div>
        {outOfStock ? (
          <div className="rounded-[10px] bg-divider py-1.5 text-center text-[11px] font-bold text-subtle">Out of stock</div>
        ) : quantity === 0 ? (
          <button
            type="button"
            onClick={onAdd}
            className="rounded-[10px] border-[1.5px] border-primary bg-surface py-1.5 text-[11.5px] font-bold text-primary hover:bg-accent-50"
          >
            ADD
          </button>
        ) : (
          <div className="flex items-center justify-between rounded-[10px] bg-primary px-2 py-1">
            <button type="button" onClick={onRemove} className="text-white">
              <Icon name="remove" size={16} />
            </button>
            <span className="text-[12.5px] font-bold text-white">{quantity}</span>
            <button type="button" onClick={onAdd} className="text-white">
              <Icon name="add" size={16} />
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
