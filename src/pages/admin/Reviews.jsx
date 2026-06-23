import { useEffect, useState } from 'react';
import {
  Star,
  Trash2,
  MessageSquare,
  Search,
  Filter,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'react-toastify';
import api from '@/lib/axios';

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [flaggedFilter, setFlaggedFilter] = useState('all');
  const [selectedReview, setSelectedReview] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [respondOpen, setRespondOpen] = useState(false);
  const [respondLoading, setRespondLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState(null);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reviews');
      const list = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
          ? res.data
          : [];
      setReviews(list);
    } catch (e) {
      console.error('Failed to fetch reviews:', e);
      toast.error('Failed to load reviews');
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleRespond = async () => {
    if (!selectedReview || !responseText.trim()) return;
    try {
      setRespondLoading(true);
      await api.post(`/reviews/${selectedReview._id}/respond`, { response: responseText.trim() });
      toast.success('Response submitted successfully');
      setRespondOpen(false);
      setResponseText('');
      fetchReviews();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to submit response');
    } finally {
      setRespondLoading(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!reviewToDelete) return;
    try {
      await api.delete(`/reviews/${reviewToDelete._id}`);
      toast.success('Review removed successfully');
      setDeleteConfirmOpen(false);
      setReviewToDelete(null);
      fetchReviews();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete review');
    }
  };

  const filteredReviews = reviews.filter((review) => {
    const matchesSearch =
      !searchQuery ||
      review.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.vendor?.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.comment?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRating = ratingFilter === 'all' || review.rating === parseInt(ratingFilter);
    const matchesFlagged =
      flaggedFilter === 'all' ||
      (flaggedFilter === 'flagged' && review.isFlagged) ||
      (flaggedFilter === 'unflagged' && !review.isFlagged);

    return matchesSearch && matchesRating && matchesFlagged;
  });

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'flagged':
        return <Badge className="bg-red-100 text-red-800">Flagged</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status || 'Published'}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Review Management</h1>
          <p className="text-gray-500 mt-1">Monitor, respond to, and manage customer reviews</p>
        </div>
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex-1 w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by user, vendor, or review content..."
                  className="pl-9 w-full"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <Select value={ratingFilter} onValueChange={setRatingFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ratings</SelectItem>
                  <SelectItem value="5">5 Stars</SelectItem>
                  <SelectItem value="4">4 Stars</SelectItem>
                  <SelectItem value="3">3 Stars</SelectItem>
                  <SelectItem value="2">2 Stars</SelectItem>
                  <SelectItem value="1">1 Star</SelectItem>
                </SelectContent>
              </Select>
              <Select value={flaggedFilter} onValueChange={setFlaggedFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reviews</SelectItem>
                  <SelectItem value="flagged">Flagged</SelectItem>
                  <SelectItem value="unflagged">Unflagged</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading reviews...</div>
          ) : filteredReviews.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No reviews found</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredReviews.map((review) => (
                <div key={review._id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-blue-100 text-blue-600">
                            {(review.user?.name || 'U').charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {review.user?.name || 'Anonymous'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {review.vendor?.businessName || review.vendor?.name || 'Unknown Vendor'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex">{renderStars(review.rating)}</div>
                        <span className="text-sm text-gray-500">•</span>
                        <span className="text-xs text-gray-400">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                        {review.isFlagged && (
                          <>
                            <span className="text-sm text-gray-500">•</span>
                            <Badge className="bg-red-100 text-red-700 border-red-200">
                              Flagged
                            </Badge>
                          </>
                        )}
                      </div>
                      <p className="text-gray-700 mb-3">
                        {review.comment || review.reviewText || 'No comment provided'}
                      </p>
                      {review.adminResponse && (
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mt-3">
                          <p className="text-xs font-semibold text-blue-700 mb-1">
                            Admin Response:
                          </p>
                          <p className="text-sm text-blue-900">{review.adminResponse}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-start gap-2 ml-4">
                      {getStatusBadge(review.status)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      onClick={() => {
                        setSelectedReview(review);
                        setResponseText(review.adminResponse || '');
                        setRespondOpen(true);
                      }}
                    >
                      <MessageSquare className="w-4 h-4 mr-1" />
                      {review.adminResponse ? 'Edit Response' : 'Respond'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        setReviewToDelete(review);
                        setDeleteConfirmOpen(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Respond Dialog */}
      <Dialog open={respondOpen} onOpenChange={setRespondOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Respond to Review</DialogTitle>
            <DialogDescription>
              Reply to {selectedReview?.user?.name || 'user'}'s review for{' '}
              {selectedReview?.vendor?.businessName || 'vendor'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex">{selectedReview && renderStars(selectedReview.rating)}</div>
              </div>
              <p className="text-sm text-gray-700">
                {selectedReview?.comment || selectedReview?.reviewText}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="response">Your Response</Label>
              <Textarea
                id="response"
                placeholder="Write your response to this review..."
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRespondOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRespond} disabled={respondLoading || !responseText.trim()}>
              {respondLoading ? 'Submitting...' : 'Submit Response'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove Review</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently remove this review? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {reviewToDelete && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex">{renderStars(reviewToDelete.rating)}</div>
              </div>
              <p className="text-sm text-gray-700">
                {reviewToDelete.comment || reviewToDelete.reviewText}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                — {reviewToDelete.user?.name || 'Anonymous'}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteReview}>
              Remove Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
