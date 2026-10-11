import { ChevronDown, ChevronRight, Loader2, Minus, Plus, Search, Upload, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import { clubService } from '@/services/club.service';
import { addOnService, type AddOnDto } from '@/services/addon.service';
import axios from 'axios';
import { toast } from 'react-toastify';
import UniversalLoader from '@/components/user/ui/LogoLoader';

interface SelectedDrink {
  _id: string;
  name: string;
  category?: string;
  volume?: string;
  price: number;
  images?: string[];
  quantity: number;
}

interface UploadedImage {
  url: string;
  name: string;
}

const inputClass =
  'w-full rounded-res-sm border border-res-line bg-res-surface px-3 py-2.5 type-res-body font-normal text-res-ink outline-none placeholder:text-res-ink-muted focus:border-res-brand';
const labelClass = 'type-res-small mb-1.5 block font-medium text-res-ink-muted';
const sectionClass = 'rounded-res-lg bg-res-card p-4 shadow-res-low md:p-5';
const sectionTitleClass = 'type-res-h3 text-res-ink';
const primaryButtonClass =
  'type-res-small cursor-pointer rounded-full bg-res-brand px-6 py-2.5 font-semibold text-res-ink-inverted shadow-res-low transition-colors hover:bg-res-brand-hover disabled:cursor-not-allowed disabled:opacity-50';
const ghostButtonClass =
  'type-res-small cursor-pointer rounded-full px-5 py-2.5 font-semibold text-res-ink-muted transition-colors hover:text-res-ink disabled:cursor-not-allowed disabled:opacity-50';

const BottleServiceManager = ({
  vendorId: vendorIdProp,
  onDone,
}: {
  /** Staff logins carry no vendor session — pass the venue id explicitly. */
  vendorId?: string;
  /** Embedded use (e.g. manager hub): exit callback instead of route navigation. */
  onDone?: () => void;
} = {}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [bottleSetName, setBottleSetName] = useState('');
  const [selectedTab, setSelectedTab] = useState('existing');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All Category');
  const [selectedDrinks, setSelectedDrinks] = useState<SelectedDrink[]>([]);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadImageLoading, setUploadImageLoading] = useState(false);
  const [bottleSetImage, setBottleSetImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { vendor } = useAuth();
  const navigate = useNavigate();
  const vendorId = vendorIdProp ?? vendor?._id;
  const [isLoading, setIsLoading] = useState(true);

  // New drink form state
  const [newDrink, setNewDrink] = useState({
    name: '',
    category: '',
    volume: '',
    price: '100000',
  });

  // Add-ons state
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<string[]>([]);
  const [vendorAddOns, setVendorAddOns] = useState<AddOnDto[]>([]);

  const [pricing, setPricing] = useState({
    price: '100000',
    discountPrice: '0.00',
    minQuantity: '1',
    priceVisibility: true,
  });

  const [drinks, setDrinks] = useState<any[]>([]);

  const exit = onDone ?? (() => navigate('/dashboard/club/drinks'));

  const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  const handleFileUpload = async (files: FileList) => {
    if (uploadedImages.length >= 3) {
      toast.error('You can add up to 3 images.');
      return;
    }
    setUploadLoading(true);
    try {
      const fileArray = Array.from(files).slice(0, 3 - uploadedImages.length);
      const uploadedUrls: UploadedImage[] = [];

      for (const file of fileArray) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', UPLOAD_PRESET);

        try {
          const response = await axios.post(
            `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
            formData
          );
          uploadedUrls.push({ url: response.data.secure_url, name: file.name });
        } catch (error) {
          console.error('Upload failed for', file.name, error);
          toast.error(`Upload failed for ${file.name}.`);
        }
      }
      setUploadedImages((prev) => [...prev, ...uploadedUrls]);
    } finally {
      setUploadLoading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    setUploadImageLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);
    try {
      const response = await axios.post(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        formData
      );
      setBottleSetImage(response.data.secure_url);
    } catch (error) {
      console.error('Upload failed for', file.name, error);
      toast.error('Bottle set image upload failed.');
    } finally {
      setUploadImageLoading(false);
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!bottleSetName.trim()) {
      toast.error('Please enter a bottle set name.');
      return;
    }

    if (selectedDrinks.length === 0) {
      toast.error('Please add at least one drink to the bottle set.');
      return;
    }

    try {
      setSaving(true);
      const bottleSetPayload = {
        name: bottleSetName.trim(),
        clubId: vendorId,
        items: selectedDrinks.map((drink) => ({
          drinkId: drink._id,
          quantity: drink.quantity,
        })),
        image: bottleSetImage,
        addOns: vendorAddOns
          .filter((addOn) => selectedAddOnIds.includes(addOn._id))
          .map((addOn) => addOn.name),
        addonIds: selectedAddOnIds,
        setPrice: pricing.price,
        discount: pricing.discountPrice,
        priceVisibility: pricing.priceVisibility,
      };

      await clubService.createBottleSet(bottleSetPayload);
      toast.success('Bottle set created successfully!');
      exit();
    } catch (error) {
      console.error('Error creating bottle set:', error);
      toast.error('Could not create the bottle set.');
    } finally {
      setSaving(false);
    }
  };

  const createNewDrink = async () => {
    if (!newDrink.name || !newDrink.category) {
      toast.error('Please fill in required fields (name and category).');
      return;
    }

    try {
      const payload = {
        name: newDrink.name,
        category: newDrink.category,
        volume: newDrink.volume || null,
        price: parseFloat(newDrink.price) || 0,
        quantity: 0,
        status: 'Active',
        images: uploadedImages.map((img) => img.url),
        visibility: true,
      };

      const response = await clubService.createDrinkType(payload);

      setSelectedDrinks((prev) => [...prev, { ...response, quantity: 1 }]);
      // Also add the created drink to the master drinks list so it appears in the "Existing" tab
      setDrinks((prev) => [...prev, { ...response, quantity: undefined }]);

      // Reset form
      setNewDrink({
        name: '',
        category: '',
        volume: '',
        price: '100000',
      });
      setUploadedImages([]);

      // Switch to existing tab
      setSelectedTab('existing');

      toast.success('Drink created and added to your set!');
    } catch (err) {
      console.error('Error creating drink type:', err);
      toast.error('Could not create the drink.');
    }
  };

  const addDrink = (drink: any) => {
    const existing = selectedDrinks.find((d) => d._id === drink._id);
    if (existing) {
      setSelectedDrinks(
        selectedDrinks.map((d) => (d._id === drink._id ? { ...d, quantity: d.quantity + 1 } : d))
      );
    } else {
      setSelectedDrinks([...selectedDrinks, { ...drink, quantity: 1 }]);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    setSelectedDrinks(
      selectedDrinks
        .map((d) => (d._id === id ? { ...d, quantity: Math.max(1, d.quantity + delta) } : d))
        .filter((d) => d.quantity > 0)
    );
  };

  const filteredDrinks = drinks.filter((drink: any) =>
    String(drink.name ?? '')
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  ).filter(
    (drink: any) => categoryFilter === 'All Category' || drink.category === categoryFilter
  );

  useEffect(() => {
    const fetchDrinks = async () => {
      try {
        if (!vendorId) {
          setIsLoading(false);
          return;
        }
        const [data, addOnList] = await Promise.all([
          clubService.getDrinks(vendorId),
          addOnService.list({ appliesTo: 'drink' }),
        ]);
        setDrinks(data.drinks ?? []);
        setVendorAddOns(addOnList);
      } catch (error) {
        console.error('Error fetching drinks:', error);
        toast.error('Could not load drinks and add-ons.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDrinks();
  }, [vendorId]);

  if (isLoading) {
    return <UniversalLoader fullscreen />;
  }

  const totalItems = selectedDrinks.reduce((acc, d) => acc + d.quantity, 0);

  const renderPreviewCard = () => (
    <div className={sectionClass}>
      <h2 className={sectionTitleClass}>Preview</h2>
      <p className="type-res-small mt-0.5 font-normal text-res-ink-muted">
        {bottleSetName.trim() || 'Bottle set'} · {totalItems} drink{totalItems === 1 ? '' : 's'}
      </p>
      <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
        {selectedDrinks.map((drink) => (
          <div
            key={drink._id}
            className="flex items-center gap-2 rounded-res-sm bg-res-surface p-2"
          >
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded-res-sm bg-res-surface">
              {drink.images?.[0] ? (
                <img
                  src={drink.images[0]}
                  alt={drink.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <span className="type-res-small font-medium text-res-ink-muted">No photo</span>
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="type-res-small truncate font-semibold text-res-ink">{drink.name}</h4>
              <p className="type-res-small font-normal text-res-ink-muted">
                {[drink.category, drink.volume].filter(Boolean).join(' · ')}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <span className="type-res-small font-semibold whitespace-nowrap text-res-ink">
                ₦{Number(drink.price ?? 0).toLocaleString()}
              </span>
              <button
                type="button"
                onClick={() => updateQuantity(drink._id, -1)}
                aria-label={`Decrease quantity of ${drink.name}`}
                className="cursor-pointer rounded-full border border-res-line p-1.5 text-res-ink transition-colors outline-none hover:text-res-brand focus-visible:ring-2 focus-visible:ring-res-brand"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="type-res-small w-5 text-center font-semibold text-res-ink">
                {drink.quantity}
              </span>
              <button
                type="button"
                onClick={() => updateQuantity(drink._id, 1)}
                aria-label={`Increase quantity of ${drink.name}`}
                className="cursor-pointer rounded-full border border-res-line p-1.5 text-res-ink transition-colors outline-none hover:text-res-brand focus-visible:ring-2 focus-visible:ring-res-brand"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-res-line pt-3">
        <span className="type-res-small font-medium text-res-ink">Total items</span>
        <span className="type-res-small font-semibold text-res-ink">{totalItems}</span>
      </div>
      <button
        type="button"
        onClick={() => setSelectedDrinks([])}
        className="type-res-small mt-2 w-full cursor-pointer rounded-full py-2 font-semibold text-red-600 transition-colors outline-none hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-500"
      >
        Clear all
      </button>
    </div>
  );

  // Step 1: Club Identity & Add Drinks
  const renderStep1 = () => (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-4">
        {/* Club Identity */}
        <div className={sectionClass}>
          <h2 className={sectionTitleClass}>Club identity</h2>
          <div className="mt-3">
            <label className={labelClass} htmlFor="bottle-set-name">
              Bottle set name <span className="text-red-600">*</span>
            </label>
            <input
              id="bottle-set-name"
              type="text"
              placeholder="e.g. Ballers Combo, VIP Island"
              value={bottleSetName}
              onChange={(e) => setBottleSetName(e.target.value)}
              className={inputClass}
            />
            <p className="type-res-small mt-1 font-normal text-res-ink-muted">
              This name will be displayed to customers.
            </p>
          </div>
        </div>

        {/* Add Drinks */}
        <div className={sectionClass}>
          <h2 className={sectionTitleClass}>Add drinks to set</h2>

          {/* Tabs */}
          <div className="mt-3 flex w-full gap-1 rounded-res-md bg-res-surface p-1 sm:w-max sm:rounded-full">
            {(
              [
                { id: 'existing', label: 'Select existing drink' },
                { id: 'new', label: 'Create new drink' },
              ] as const
            ).map((tab) => {
              const isActive = selectedTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`type-res-small flex-1 cursor-pointer rounded-full px-4 py-2 whitespace-nowrap transition-all outline-none focus-visible:ring-2 focus-visible:ring-res-brand sm:flex-none ${
                    isActive
                      ? 'bg-res-card text-res-brand shadow-res-low'
                      : 'text-res-ink-muted hover:text-res-ink'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {selectedTab === 'existing' ? (
            <div className="mt-4">
              {/* Search and Filter */}
              <div className="flex flex-col gap-2.5 sm:flex-row">
                <label className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-res-surface px-4 py-2.5">
                  <Search className="h-4 w-4 shrink-0 text-res-ink-muted" />
                  <input
                    type="text"
                    placeholder="Search drinks…"
                    aria-label="Search drinks"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="type-res-body w-full bg-transparent font-normal text-res-ink outline-none placeholder:text-res-ink-muted"
                  />
                </label>
                <div className="relative sm:w-48">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    aria-label="Filter by category"
                    className="w-full appearance-none rounded-res-sm border border-res-line bg-res-card px-3 py-2.5 type-res-body font-normal text-res-ink shadow-res-low outline-none focus:border-res-brand"
                  >
                    <option>All Category</option>
                    <option>Whiskey</option>
                    <option>Champagne</option>
                    <option>Vodka</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-res-ink-muted" />
                </div>
              </div>

              {/* Drinks List */}
              <div className="mt-3 max-h-96 space-y-2 overflow-y-auto">
                {filteredDrinks.length === 0 ? (
                  <div className="rounded-res-md bg-res-surface px-6 py-10 text-center">
                    <p className="type-res-h3 text-res-ink">No drinks found</p>
                    <p className="type-res-small mx-auto mt-1 max-w-sm font-normal text-res-ink-muted">
                      Try adjusting the search or create a new drink instead.
                    </p>
                  </div>
                ) : (
                  filteredDrinks.map((drink) => (
                    <div
                      key={(drink as any)._id}
                      className="flex items-center justify-between gap-3 rounded-res-sm border border-res-line p-3 transition-colors hover:border-res-brand"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-res-sm bg-res-surface">
                          {drink.images?.[0] ? (
                            <img
                              src={drink.images[0]}
                              alt={drink.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <span className="type-res-small font-medium text-res-ink-muted">
                                No photo
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="type-res-body truncate font-semibold text-res-ink">
                            {drink.name}
                          </h3>
                          <p className="type-res-small font-normal text-res-ink-muted">
                            {[drink.category, drink.volume].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="type-res-body font-semibold whitespace-nowrap text-res-ink">
                          ₦{Number(drink.price ?? 0).toLocaleString()}
                        </span>
                        <button
                          type="button"
                          onClick={() => addDrink(drink)}
                          className="type-res-small inline-flex cursor-pointer items-center gap-1 rounded-full bg-res-brand px-4 py-2 font-semibold text-res-ink-inverted shadow-res-low transition-colors outline-none hover:bg-res-brand-hover focus-visible:ring-2 focus-visible:ring-res-brand"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="new-drink-name">
                    Drink name <span className="text-red-600">*</span>
                  </label>
                  <input
                    id="new-drink-name"
                    type="text"
                    placeholder="e.g. Moet & Chandon Ice Imperial"
                    value={newDrink.name}
                    onChange={(e) => setNewDrink({ ...newDrink, name: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="new-drink-category">
                    Drink category <span className="text-red-600">*</span>
                  </label>
                  <div className="relative">
                    <select
                      id="new-drink-category"
                      value={newDrink.category}
                      onChange={(e) => setNewDrink({ ...newDrink, category: e.target.value })}
                      className={`${inputClass} appearance-none`}
                    >
                      <option value="">Select category</option>
                      <option>Whiskey</option>
                      <option>Champagne</option>
                      <option>Vodka</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-res-ink-muted" />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="new-drink-volume">
                    Volume <span className="font-normal">(optional)</span>
                  </label>
                  <input
                    id="new-drink-volume"
                    type="text"
                    placeholder="e.g. 75cl"
                    value={newDrink.volume}
                    onChange={(e) => setNewDrink({ ...newDrink, volume: e.target.value })}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass} htmlFor="new-drink-price">
                    Price
                  </label>
                  <div className="flex items-center gap-2 rounded-res-sm border border-res-line bg-res-surface px-3 py-2.5">
                    <span className="type-res-body font-semibold text-res-ink">₦</span>
                    <input
                      id="new-drink-price"
                      type="text"
                      value={newDrink.price}
                      onChange={(e) => setNewDrink({ ...newDrink, price: e.target.value })}
                      className="type-res-body w-full bg-transparent font-normal text-res-ink outline-none placeholder:text-res-ink-muted"
                    />
                  </div>
                </div>
              </div>

              <div>
                <span className={labelClass}>Image upload</span>
                <p className="type-res-small -mt-1 mb-2 font-normal text-res-ink-muted">
                  You can add up to 3 images.
                </p>

                {/* Image previews */}
                {uploadedImages.length > 0 && (
                  <div className="mb-3 grid grid-cols-3 gap-2">
                    {uploadedImages.map((img, index) => (
                      <div key={`${img.url}-${index}`} className="group relative">
                        <img
                          src={img.url}
                          alt={img.name}
                          className="h-24 w-full rounded-res-sm object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          aria-label={`Remove ${img.name}`}
                          className="absolute top-1 right-1 cursor-pointer rounded-full bg-red-500 p-1 text-white transition-opacity outline-none focus-visible:ring-2 focus-visible:ring-red-500 lg:opacity-0 lg:group-hover:opacity-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {uploadedImages.length < 3 && (
                  <label
                    htmlFor="new-drink-images"
                    className="block cursor-pointer rounded-res-md border border-dashed border-res-line bg-res-surface p-6 text-center transition-colors hover:border-res-brand sm:p-8"
                  >
                    <input
                      type="file"
                      id="new-drink-images"
                      accept="image/jpeg,image/png,image/gif"
                      multiple
                      onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                      className="sr-only"
                      disabled={uploadLoading}
                    />
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-res-card">
                      {uploadLoading ? (
                        <Loader2 className="h-6 w-6 animate-spin text-res-brand" />
                      ) : (
                        <Upload className="h-6 w-6 text-res-ink-muted" />
                      )}
                    </div>
                    <p className="type-res-small font-semibold text-res-ink">
                      {uploadLoading ? 'Uploading…' : 'Drop images here, or browse files'}
                    </p>
                    <p className="type-res-small mt-0.5 font-normal text-res-ink-muted">
                      JPG, PNG or GIF · max 5MB
                    </p>
                  </label>
                )}
              </div>

              {/* Create Button */}
              <button
                type="button"
                onClick={createNewDrink}
                className={`${primaryButtonClass} w-full`}
              >
                Create & add drink
              </button>
            </div>
          )}
        </div>

        {/* Set photo */}
        <div className={sectionClass}>
          <h2 className={sectionTitleClass}>Bottle set photo</h2>
          <label
            htmlFor="bottle-set-image"
            className="mt-3 block cursor-pointer rounded-res-md border border-dashed border-res-line bg-res-surface p-6 text-center transition-colors hover:border-res-brand sm:p-8"
          >
            <input
              type="file"
              id="bottle-set-image"
              accept="image/jpeg,image/png,image/gif"
              onChange={(e) => e.target.files && handleImageUpload(e.target.files[0])}
              className="sr-only"
              disabled={uploadImageLoading}
            />
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-res-card">
              {uploadImageLoading ? (
                <Loader2 className="h-6 w-6 animate-spin text-res-brand" />
              ) : (
                <Upload className="h-6 w-6 text-res-ink-muted" />
              )}
            </div>
            <p className="type-res-small font-semibold text-res-ink">
              {uploadImageLoading ? 'Uploading…' : 'Drop a photo here, or browse files'}
            </p>
            <p className="type-res-small mt-0.5 font-normal text-res-ink-muted">
              JPG, PNG or GIF · max 5MB
            </p>
          </label>
          {bottleSetImage && (
            <div className="mt-3">
              <img
                src={bottleSetImage}
                alt="Bottle set"
                className="h-48 w-full rounded-res-md object-cover"
              />
            </div>
          )}
        </div>

        {/* Mobile preview */}
        {selectedDrinks.length > 0 && <div className="lg:hidden">{renderPreviewCard()}</div>}
      </div>

      {/* Desktop preview */}
      {selectedDrinks.length > 0 && (
        <div className="hidden lg:block">
          <div className="sticky top-4">{renderPreviewCard()}</div>
        </div>
      )}
    </div>
  );

  // Step 2: Add-ons and Pricing
  const renderStep2 = () => (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Available Add-Ons */}
      <div className={sectionClass}>
        <h2 className={sectionTitleClass}>Available add-ons</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {vendorAddOns.length === 0 ? (
            <p className="type-res-small font-normal text-res-ink-muted">
              No add-ons yet — create them under Add-ons.
            </p>
          ) : (
            vendorAddOns.map((addOn) => {
              const active = selectedAddOnIds.includes(addOn._id);
              return (
                <button
                  key={addOn._id}
                  type="button"
                  role="switch"
                  aria-checked={active}
                  onClick={() =>
                    setSelectedAddOnIds((prev) =>
                      prev.includes(addOn._id)
                        ? prev.filter((id) => id !== addOn._id)
                        : [...prev, addOn._id]
                    )
                  }
                  className={`flex w-full cursor-pointer items-center justify-between gap-3 rounded-res-sm border p-3 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-res-brand ${
                    active ? 'border-res-brand bg-res-surface' : 'border-res-line bg-res-card'
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="type-res-body block truncate font-semibold text-res-ink">
                      {addOn.name}
                    </span>
                    <span className="type-res-small block font-normal text-res-ink-muted">
                      ₦{Number(addOn.price ?? 0).toLocaleString()}
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                      active ? 'bg-res-brand' : 'bg-res-brand-disabled'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                        active ? 'left-[22px]' : 'left-0.5'
                      }`}
                    />
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Pricing Details */}
      <div className={sectionClass}>
        <h2 className={sectionTitleClass}>Pricing details</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="bottle-set-price">
              Price
            </label>
            <div className="flex items-center gap-2 rounded-res-sm border border-res-line bg-res-surface px-3 py-2.5">
              <span className="type-res-body font-semibold text-res-ink">₦</span>
              <input
                id="bottle-set-price"
                type="text"
                value={pricing.price}
                onChange={(e) => setPricing({ ...pricing, price: e.target.value })}
                className="type-res-body w-full bg-transparent font-normal text-res-ink outline-none placeholder:text-res-ink-muted"
              />
            </div>
          </div>
          <div>
            <label className={labelClass} htmlFor="bottle-set-discount">
              Optional discount price
            </label>
            <div className="flex items-center gap-2 rounded-res-sm border border-res-line bg-res-surface px-3 py-2.5">
              <span className="type-res-body font-semibold text-res-ink">₦</span>
              <input
                id="bottle-set-discount"
                type="text"
                value={pricing.discountPrice}
                onChange={(e) => setPricing({ ...pricing, discountPrice: e.target.value })}
                className="type-res-body w-full bg-transparent font-normal text-res-ink outline-none placeholder:text-res-ink-muted"
              />
            </div>
          </div>
        </div>
        <div className="mt-4">
          <label className={labelClass} htmlFor="bottle-set-min-qty">
            Minimum order quantity
          </label>
          <input
            id="bottle-set-min-qty"
            type="number"
            min={1}
            value={pricing.minQuantity}
            onChange={(e) => setPricing({ ...pricing, minQuantity: e.target.value })}
            className={inputClass}
          />
          <p className="type-res-small mt-1 font-normal text-res-ink-muted">
            Leave empty for no minimum quantity.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={pricing.priceVisibility}
          onClick={() => setPricing({ ...pricing, priceVisibility: !pricing.priceVisibility })}
          className="mt-4 flex w-full cursor-pointer items-center justify-between gap-3 rounded-res-sm bg-res-surface p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-res-brand"
        >
          <span className="min-w-0 flex-1">
            <span className="type-res-body block font-semibold text-res-ink">
              Enable price visibility to customers
            </span>
            <span className="type-res-small block font-normal text-res-ink-muted">
              When disabled, customers will see “Contact for price”.
            </span>
          </span>
          <span
            aria-hidden
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
              pricing.priceVisibility ? 'bg-res-brand' : 'bg-res-brand-disabled'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                pricing.priceVisibility ? 'left-[22px]' : 'left-0.5'
              }`}
            />
          </span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="mb-12 space-y-6 md:p-6">
      <nav aria-label="Breadcrumb" className="type-res-small flex items-center gap-1 font-medium">
        <button
          type="button"
          onClick={exit}
          className="cursor-pointer font-normal text-res-ink-muted transition-colors hover:text-res-brand"
        >
          Drinks
        </button>
        <ChevronRight className="h-3.5 w-3.5 text-res-ink-muted" />
        <span aria-current="page" className="font-semibold text-res-ink">
          Create bottle set
        </span>
      </nav>

      <DashboardPageHeader
        title="Create bottle set"
        subtitle="Bundle drinks into a set guests can order together."
      />

      {/* Step indicator */}
      <ol className="flex items-center gap-2" aria-label="Bottle set setup progress">
        {[
          { step: 1, label: 'Drinks' },
          { step: 2, label: 'Add-ons & pricing' },
        ].map((item) => {
          const isActive = currentStep === item.step;
          const isDone = currentStep > item.step;
          return (
            <li key={item.step} className="flex items-center gap-2">
              <span
                aria-current={isActive ? 'step' : undefined}
                className={`type-res-small inline-flex items-center gap-2 rounded-full px-3.5 py-2 font-semibold ${
                  isActive || isDone
                    ? 'bg-res-brand text-res-ink-inverted shadow-res-low'
                    : 'bg-res-surface text-res-ink-muted'
                }`}
              >
                <span
                  aria-hidden
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-white/25 text-[11px]"
                >
                  {item.step}
                </span>
                {item.label}
              </span>
              {item.step === 1 && <span aria-hidden className="h-px w-6 bg-res-line" />}
            </li>
          );
        })}
        <span className="type-res-small ml-auto hidden font-normal text-res-ink-muted sm:block">
          Step {currentStep} of 2
        </span>
      </ol>

      {/* Main Content */}
      {currentStep === 1 ? renderStep1() : renderStep2()}

      {/* Bottom Navigation */}
      <div className="sticky bottom-0 flex flex-col gap-2 rounded-res-lg border border-res-line bg-res-card p-4 shadow-res-medium sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={() => currentStep > 1 && setCurrentStep(currentStep - 1)}
          disabled={currentStep === 1}
          className={ghostButtonClass}
        >
          Back
        </button>
        <button
          type="button"
          disabled={(currentStep === 2 && selectedDrinks.length === 0) || saving}
          onClick={() => (currentStep < 2 ? setCurrentStep(currentStep + 1) : handleSubmit())}
          className={`${primaryButtonClass} sm:min-w-44`}
        >
          {currentStep === 2 ? (saving ? 'Saving…' : 'Complete setup') : 'Continue'}
        </button>
      </div>
    </div>
  );
};

export default BottleServiceManager;
