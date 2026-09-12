import PreSelectMeal from '@/components/user/restaurant/PreSelectMeal';
import ReservationDetails from '@/components/user/restaurant/ReservationDetails';
import { useReservations } from '@/contexts/restaurant/ReservationContext';
import { useParams } from 'react-router';

const Reservation = () => {
  const { id } = useParams();
  const { page } = useReservations();

  return (
    <div className="">
      {page === 1 ? <PreSelectMeal id={id!} /> : <ReservationDetails id={id!} />}
    </div>
  );
};

export default Reservation;
