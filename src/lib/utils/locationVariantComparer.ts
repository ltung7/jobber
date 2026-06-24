interface SortableVariantLocationProduct {
    location: string;
    productId: string;
    variant: string;
}

export default (a : SortableVariantLocationProduct, b : SortableVariantLocationProduct) => {
    if (a.location !== b.location) return a.location.localeCompare(b.location);
    if (a.productId !== b.productId) return a.productId.localeCompare(b.productId);
    return a.variant.localeCompare(b.variant);
}