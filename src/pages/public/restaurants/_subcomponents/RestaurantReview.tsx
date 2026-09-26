import React, { useState, useEffect } from 'react';
import { userService } from '@/services/user.service';
import StarRating from '@/components/ui/starrating';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import UniversalLoader from '@/components/user/ui/LogoLoader';
import type { AuthUser } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

interface ReviewItem {
  rating: number;
  user?: string;
  comment?: string;
  createdAt?: string;
}

interface RestaurantReviewsProps {
  restaurantId: string;
  ratings?: number;
}

const RestaurantReviews = ({ restaurantId }: RestaurantReviewsProps) => {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [newRating, setNewRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  // Fetch reviews from backend
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await userService.getReviews(restaurantId); // <-- implement in your user.service
        setReviews(res.data || []);
      } catch (err) {
        console.error('Error fetching reviews:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, [restaurantId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRating || !comment.trim()) return alert('Please enter all fields');
    setIsLoading(true);
    try {
      const userName = user ? `${user.firstName} ${user.lastName}` : 'Guest';
      const newReview = { vendor: restaurantId, rating: newRating, comment, user: userName };
      const res = await userService.createReview(newReview);
      setReviews([res, ...reviews]);
      setNewRating(0);
      setComment('');
      toast.success('Added Review succesfully!');
    } catch (err) {
      toast.error('Error submitting review:');
      console.error('Error submitting review:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) return <UniversalLoader />;

  const average =
    reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : 0;

  return (
    <div className="space-y-6">
      {/* Average Rating */}
      <div className="flex items-center gap-2">
        <StarRating rating={Number(average)} readOnly size={20} />
        <span className="font-semibold text-lg">{average}</span>
        <span className="text-gray-600">({reviews.length} reviews)</span>
      </div>

      {/* Review Form */}
      <form
        onSubmit={handleSubmit}
        className="space-y-3 p-4 rounded-res-sm bg-res-secondary shadow-res-low"
      >
        <h3 className="font-semibold text-lg">Leave a Review</h3>
        <StarRating rating={newRating} size={20} onChange={(value: number) => setNewRating(value)} />
        <Textarea
          className="resize-none h-[100px] font-normal bg-res-surface border border-res-line rounded-res-sm w-full"
          placeholder="Write your review..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <Button
          type="submit"
          disabled={isLoading || !newRating || !comment}
          className="rounded-res-sm bg-res-brand hover:bg-res-brand-hover"
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" /> Loading
            </>
          ) : (
            'Submit Review'
          )}
        </Button>
      </form>

      {/* Review List */}
      <div className="space-y-4">
        {reviews.length === 0 ? (
          <p className="text-gray-500 text-sm">No reviews yet.</p>
        ) : (
          reviews.map((r, i) => {
            const userName = r.user || 'Guest';
            const initials = userName.charAt(0).toUpperCase();

            return (
              <div key={i} className="rounded-lg flex gap-3 items-start">
                {/* Avatar */}
                <div className="shrink-0 w-10 h-10 rounded-full bg-res-secondary flex items-center justify-center text-res-brand font-semibold text-sm">
                  {initials}
                </div>

                {/* Review Content */}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-900 text-sm line-clamp-1">{userName}</h4>
                    <span className="text-xs text-gray-500">
                      {new Date(r.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <StarRating rating={r.rating} readOnly size={16} />
                  <p className="text-gray-700 mt-1 text-sm">{r.comment}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default RestaurantReviews;
