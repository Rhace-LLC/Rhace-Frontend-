import DashboardButton from '@/components/dashboard/ui/DashboardButton';
import { Cash2, Delete2, DishCover, DragDrop } from '@/components/dashboard/ui/svg';
import Header2 from '@/navigation/vendor_layout/_sub_component/VendorHeader2';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import UniversalLoader from '@/components/user/ui/LogoLoader';
import { dishService } from '@/services/dish.service';
import { menuCategoryService, type CategoryDto } from '@/services/menuCategory.service';
import { addOnService, type AddOnDto } from '@/services/addon.service';
import axios from 'axios';
import { Check, CheckCircle, DownloadCloud, Loader2, Plus, Trash2, Upload, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useNavigate, useParams } from 'react-router';
import { toast } from 'react-toastify';

interface NewItemState {
  name: string;
  description: string;
  categoryId: string;
  price: number;
  tags: string[];
  mealTimes: string[];
  discount: boolean;
  discountPrice: number;
  coverImage: string;
  addonIds: string[];
  isVisible: boolean;
  images?: unknown[];
}

const CreateMenu = () => {
  const { id: dishId } = useParams();
  const isEdit = Boolean(dishId);
  const [step, setStep] = useState(0);
  const [newItem, setNewItem] = useState<NewItemState>({
    name: '',
    description: '',
    categoryId: '',
    price: 0,
    tags: [],
    mealTimes: [],
    discount: true,
    discountPrice: 0,
    coverImage: '',
    addonIds: [],
    isVisible: true,
  });
  const [loading, setLoading] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const navigate = useNavigate();
  const initialTags = ['Spicy', 'Popular', 'Savory'];
  const [tags, setTags] = useState<string[]>(initialTags);
  const [newTag, setNewTag] = useState('');
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [addonOptions, setAddonOptions] = useState<AddOnDto[]>([]);
  const [createItem, setCreateItem] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState(false);

  const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  const toggleTag = (t: string) => {
    setNewItem((prev) => ({
      ...prev,
      tags: prev.tags.includes(t) ? prev.tags.filter((x) => x !== t) : [...prev.tags, t],
    }));
  };

  const addTag = () => {
    if (!newTag.trim()) return;
    if (!tags.includes(newTag.trim())) {
      setTags((t) => [...t, newTag.trim()]);
    }
    setNewTag('');
  };

  const handleCreateNewMenu = () => {
    setSuccessModal(false);
  };

  const handleNext = async () => {
    try {
      setLoading(true);
      if (!newItem.name || !newItem.categoryId || newItem.price <= 0) {
        toast.error('Name, category and price are required.');
        return;
      }
      const payload = {
        name: newItem.name,
        description: newItem.description,
        price: newItem.price,
        categoryId: newItem.categoryId,
        mealTimes: newItem.mealTimes,
        tags: newItem.tags,
        coverImage: newItem.coverImage,
        images: newItem.coverImage ? [newItem.coverImage] : [],
        availability: newItem.isVisible,
        isVisible: newItem.isVisible,
        discount: newItem.discount,
        discountPrice: newItem.discount ? newItem.discountPrice : undefined,
        addonIds: newItem.addonIds,
      };

      const saved = isEdit && dishId
        ? await dishService.update(dishId, payload)
        : await dishService.create(payload);
      setCreateItem(saved);
      toast.success(isEdit ? 'Dish updated' : 'Dish created');

      if (isEdit) {
        navigate('/dashboard/restaurant/menu');
        return;
      }

      setSuccessModal(true);
      setNewItem({
        name: '',
        description: '',
        categoryId: '',
        price: 0,
        tags: [],
        mealTimes: [],
        discount: true,
        discountPrice: 0,
        coverImage: '',
        addonIds: [],
        isVisible: true,
      });
    } catch (error) {
      console.error(error);
      toast.error(isEdit ? 'Error updating dish' : 'Error creating dish');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = useCallback(
    async (files: FileList, setImage: Dispatch<SetStateAction<any>>) => {
      setUploadLoading(true);
      const file = files[0];
      if (file.size > 5242880) {
        alert('File size exceeds 5MB limit.');
        return;
      }

      const fileName = file.name;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);

      try {
        const response = await axios.post(
          `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
          formData
        );

        const imageUrl = response.data.secure_url;
        setImage((prev: any) => ({ ...prev, coverImage: imageUrl }));
      } catch (error) {
        console.error('Upload failed for', fileName, error);
      } finally {
        setUploadLoading(false);
      }
    },
    [newItem.images]
  );

  const handleCancel = () => {
    if (step === 0) {
      navigate(-1);
    } else {
      setStep((prev) => prev - 1);
    }
  };

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const [categoryList, addonList] = await Promise.all([
          menuCategoryService.list(),
          addOnService.list({ appliesTo: 'dish' }),
        ]);
        setCategories(categoryList);
        setAddonOptions(addonList);

        if (isEdit && dishId) {
          const dish = await dishService.get(dishId);
          const categoryId =
            typeof dish.categoryId === 'object' && dish.categoryId
              ? dish.categoryId._id
              : (dish.categoryId as string | undefined) ?? '';
          setNewItem({
            name: dish.name ?? '',
            description: dish.description ?? '',
            categoryId: categoryId ?? '',
            price: dish.price ?? 0,
            tags: dish.tags ?? [],
            mealTimes: dish.mealTimes ?? [],
            discount: dish.discount ?? false,
            discountPrice: dish.discountPrice ?? 0,
            coverImage: dish.coverImage ?? dish.images?.[0] ?? '',
            addonIds: (dish.addonIds ?? []).map((entry: unknown) =>
              typeof entry === 'object' && entry ? String((entry as { _id: string })._id) : String(entry)
            ),
            isVisible: dish.isVisible ?? true,
          });
        }
      } catch {
        toast.error('Could not load categories/add-ons.');
      } finally {
        setIsLoading(false);
      }
    };
    loadCatalog();
  }, [isEdit, dishId]);

  if (isLoading) return <UniversalLoader fullscreen />;

  return (
    <div className="bg-[#F9FAFB] min-h-dvh pb-16">
      <Header2 title={isEdit ? 'Edit Dish' : 'Create Dish'} />
      <div className=" flex">
        <div className="md:p-6 space-y-[45px] flex-1">
          <div className="max-w-[1300px] w-full mx-auto">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-6">
                <div className="px-5 py-6 bg-white rounded-2xl border border-[#E5E7EB] w-full space-y-4">
                  <h2 className="text-[#111827] font-medium text-sm">Basic Information</h2>
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label className=" text-xs" htmlFor="menuName">
                        Menu Item name <span className="text-[#EF4444]">*</span>
                      </Label>
                      <Input
                        value={newItem.name}
                        onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                        id="menuName"
                        placeholder="e.g Joe's Platter"
                        maxLength={50}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className=" text-xs" htmlFor="menuDescription">
                        Menu Description (Optional)
                      </Label>
                      <Textarea
                        value={newItem.description}
                        onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                        id="menuDescription"
                        placeholder="Add a short description or notes about this menu"
                      />
                    </div>
                  </div>
                </div>
                <div className="px-5 py-6 bg-white rounded-2xl border border-[#E5E7EB] w-full space-y-4">
                  <h2 className="text-[#111827] font-medium text-sm">Categorization</h2>
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label className="text-xs">
                        Category<span className="text-[#EF4444]">*</span>
                      </Label>
                      {categories.length === 0 ? (
                        <p className="text-xs text-gray-400">
                          No categories yet. Create one under Menu → Categories.
                        </p>
                      ) : (
                        <RadioGroup
                          value={newItem.categoryId}
                          onValueChange={(value) => setNewItem({ ...newItem, categoryId: value })}
                          className="grid grid-cols-2 md:grid-cols-3 gap-2"
                        >
                          {categories.map((category) => (
                            <div key={category._id} className="flex items-center space-x-2">
                              <RadioGroupItem value={category._id} id={category._id} />
                              <Label htmlFor={category._id}>{category.name}</Label>
                            </div>
                          ))}
                        </RadioGroup>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Menu Availability (Meal Time)</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {['Breakfast', 'Brunch', 'Lunch', 'Dinner', 'Late Night', 'All Day'].map(
                          (meal) => (
                            <div key={meal} className="flex items-center space-x-2">
                              <Checkbox
                                defaultChecked={newItem.mealTimes.includes(meal)}
                                id={meal}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setNewItem({
                                      ...newItem,
                                      mealTimes: [...newItem.mealTimes, meal],
                                    });
                                  } else {
                                    setNewItem({
                                      ...newItem,
                                      mealTimes: newItem.mealTimes.filter((item) => item !== meal),
                                    });
                                  }
                                }}
                              />
                              <Label htmlFor={meal}>{meal}</Label>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                    <div className="mt-6">
                      <label className="block text-xs font-medium text-gray-700">Tags</label>
                      <div className="mt-2">
                        <div className="flex gap-2 flex-wrap">
                          {tags.map((t) => (
                            <button
                              type="button"
                              key={t}
                              onClick={() => toggleTag(t)}
                              className={`px-3 py-1 rounded-full text-xs border ${
                                newItem.tags.includes(t) ? 'bg-gray-800 text-white' : 'bg-white'
                              }`}
                            >
                              {t}
                            </button>
                          ))}
                        </div>

                        <div className="mt-3 flex gap-2">
                          <input
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            placeholder="Add tag"
                            className="border rounded px-3 py-2 w-44"
                          />
                          <button
                            type="button"
                            onClick={addTag}
                            className="px-3 py-2 rounded bg-indigo-600 text-white"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="px-5 py-6 bg-white rounded-2xl border border-[#E5E7EB] w-full space-y-4">
                  <h2 className="text-[#111827] font-medium text-sm">Pricing</h2>
                  <div className="gap-2 items-center w-full flex">
                    <div className="flex flex-col gap-4 items-start">
                      <label className="text-sm font-medium">Price</label>
                      <div className="md:col-span-2 flex gap-4 items-center">
                        <div className="flex items-center gap-2 border rounded px-3 py-2 w-full">
                          <span className="text-lg">₦</span>
                          <input
                            type="number"
                            value={newItem.price}
                            onChange={(e) =>
                              setNewItem({ ...newItem, price: Number(e.target.value) })
                            }
                            className="w-full outline-none"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start flex-col gap-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={newItem.discount}
                          onChange={(e) => setNewItem({ ...newItem, discount: e.target.checked })}
                          className="h-5 w-5"
                        />
                        <span className="text-sm">Discount</span>
                      </label>

                      {newItem.discount && (
                        <div className="flex items-center gap-2 border rounded px-3 py-2">
                          <span>₦</span>
                          <input
                            type="number"
                            value={newItem.discountPrice}
                            onChange={(e) =>
                              setNewItem({ ...newItem, discountPrice: Number(e.target.value) })
                            }
                            className="w-28 outline-none"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div
                  className="px-5 block py-6 bg-white rounded-2xl border border-[#E5E7EB] w-full space-y-4"
                >
                  <h2 className="text-[#111827] font-medium text-sm">Images</h2>
                  <div className="space-y-2">
                    <Label>Cover Image (Optional)</Label>
                    <label
                      htmlFor="item-cover-image"
                      className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 text-center text-sm text-gray-500 cursor-pointer hover:bg-gray-50"
                    >
                      {uploadLoading ? (
                        <Loader2 className="w-6 h-6 mb-2 animate-spin" />
                      ) : (
                        <DownloadCloud className="w-6 h-6 mb-2" />
                      )}
                      <p>Drag and drop an image here, or</p>
                      {uploadLoading ? (
                        'Uploading...'
                      ) : (
                        <Button asChild variant="outline" size="sm" className="mt-2">
                          <label htmlFor="item-cover-image" className="cursor-pointer">
                            Browse Files
                          </label>
                        </Button>
                      )}
                      <p className="text-xs mt-1">JPG, PNG, or GIF • Max 5MB</p>
                      <input
                        type="file"
                        id="item-cover-image"
                        accept="image/*"
                        max={5242880}
                        onChange={(e) =>
                          e.target.files && handleImageUpload(e.target.files, setNewItem)
                        }
                        className="sr-only"
                        disabled={uploadLoading}
                      />
                    </label>
                    {newItem.coverImage && (
                      <div className="w-32 h-32 rounded-md overflow-hidden">
                        <img
                          src={newItem.coverImage}
                          alt="Cover"
                          className="object-cover w-full h-full"
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className="px-5 py-6 bg-white rounded-2xl border border-[#E5E7EB] w-full space-y-3">
                  <h2 className="text-[#111827] font-medium text-sm">Add-ons</h2>
                  {addonOptions.length === 0 ? (
                    <p className="text-xs text-gray-400">
                      No add-ons yet. Create them under Add-ons.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {addonOptions.map((addOn) => {
                        const checked = newItem.addonIds.includes(addOn._id);
                        return (
                          <label key={addOn._id} className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(value) =>
                                setNewItem({
                                  ...newItem,
                                  addonIds: value
                                    ? [...newItem.addonIds, addOn._id]
                                    : newItem.addonIds.filter((id) => id !== addOn._id),
                                })
                              }
                            />
                            <span>
                              {addOn.name} · ₦{addOn.price.toLocaleString()}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="w-full rounded-lg bg-transparent p-4">
                  <div className="flex flex-col space-y-2">
                    <Label className="text-sm font-medium text-foreground">Menu Availability</Label>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-base font-medium text-foreground">
                          Show item on menu
                        </span>
                        <span className="text-sm text-muted-foreground">
                          Make this menu item visible
                        </span>
                      </div>
                      <Switch
                        checked={newItem.isVisible}
                        onCheckedChange={(value) => setNewItem({ ...newItem, isVisible: value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="fixed flex justify-between bottom-0 left-0 w-full px-8 py-4 bg-white border-t">
        <DashboardButton
          onClick={handleCancel}
          variant="secondary"
          className="px-6 w-[158px] text-sm text-[#606368]"
          text={step === 0 ? 'Cancel' : 'Back'}
        />
        <DashboardButton
          onClick={handleNext}
          disabled={loading}
          icon={loading && <Loader2 className="animate-spin size-5" />}
          variant="primary"
          className="px-6 w-[384px] text-sm"
          text={loading ? 'Loading' : isEdit ? 'Save changes' : 'Create Dish'}
        />
      </div>
      {successModal && (
        <div className="fixed inset-0 bg-black/50 flex h-screen items-center py-10 justify-center z-50">
          <div className="max-w-2xl h-full bg-gray-50 flex flex-col rounded-2xl overflow-y-auto px-4 py-10">
            {/* Success Icon */}
            <div className="flex flex-col items-center text-center mb-8">
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-[#37703F1A] rounded-full flex items-center justify-center">
                  <div className="w-12 h-12 bg-[#37703F] rounded-full flex items-center justify-center">
                    <Check className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
              <h1 className="text-xl font-semibold text-gray-800">Menu Successfully Created</h1>
              <p className="text-gray-500 mt-2 max-w-md">
                Your pre-selected meals have been confirmed for your upcoming reservation
              </p>
            </div>

            {/* Menu Summary Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 w-full max-w-2xl mb-6">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-3">Menu Summary</h2>
                <hr className="mb-4" />

                <div className="grid grid-cols-2 gap-y-3 text-sm text-gray-700">
                  <div className="space-y-3">
                    <div>
                      <p className="text-gray-500">Menu Name</p>
                      <p className="font-medium">{createItem.name}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Date Created</p>
                      <p className="font-medium">{new Date().toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-gray-500">Meal Times</p>
                      <p className="font-medium">{createItem.mealTimes.join(', ')}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Meal Tags</p>
                      <p className="font-medium">{createItem.tags.join(', ')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-2xl">
              <button
                onClick={() => {
                  navigate(-1);
                }}
                className="flex-1 border border-gray-300 rounded-xl py-3 font-medium text-gray-700 hover:bg-gray-100 transition"
              >
                Back to Menu List
              </button>
              <button
                onClick={handleCreateNewMenu}
                className="flex-1 bg-teal-700 text-white rounded-xl py-3 font-medium hover:bg-teal-800 transition"
              >
                Create New Menu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateMenu;