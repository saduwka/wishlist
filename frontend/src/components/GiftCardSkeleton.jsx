export default function GiftCardSkeleton() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <div className="shimmer skeleton-image" />
      <div className="skeleton-lines">
        <div className="shimmer skeleton-line short" />
        <div className="shimmer skeleton-line" />
        <div className="shimmer skeleton-line medium" />
        <div className="shimmer skeleton-line pill" />
      </div>
    </div>
  );
}
