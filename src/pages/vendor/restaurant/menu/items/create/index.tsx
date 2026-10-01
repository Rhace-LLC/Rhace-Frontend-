import { useNavigate, useParams } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { DishWorkspace } from '../../components/DishWorkspace';

/**
 * Back-compat shell around DishWorkspace.
 * - Standalone routes (`menu/item/new`, `menu/items/:id/edit`) read the id
 *   from params and navigate back to the dish list.
 * - The manager hub renders `<CreateMenu editId? onDone>` — props win.
 */
const CreateMenu = ({
  editId,
  onDone,
}: {
  /** Embedded use (e.g. manager hub): edit id + exit callback. */
  editId?: string;
  onDone?: () => void;
} = {}) => {
  const params = useParams();
  const navigate = useNavigate();
  const { vendor } = useAuth();
  const dishId = editId ?? (params as { id?: string }).id;
  const exit = onDone ?? (() => navigate('/dashboard/restaurant/menu'));

  return (
    <div className="mb-12 space-y-6 md:p-6">
      <DishWorkspace
        mode={dishId ? 'edit' : 'new'}
        dishId={dishId}
        vendorId={vendor?._id}
        onExit={exit}
        onSaved={exit}
      />
    </div>
  );
};

export default CreateMenu;
