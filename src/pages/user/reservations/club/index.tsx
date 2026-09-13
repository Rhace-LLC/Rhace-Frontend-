'use client';
import ReservationDetails from '@/components/user/club/ReservationDetails';
import { useReservations } from '@/contexts/club/ReservationContext';
import { useEffect } from 'react';
import ReservationSummary from '@/components/user/club/ReservationSummary';
import { useParams } from 'react-router';
import { userService } from '@/services/user.service';
import { clubService } from '@/services/club.service';

const Reservation = () => {
  const {
    setComboItems,
    setBottleItems,
    setTable,
    setVendor,
    setLoading,
    setComboLoading,
    setBottlesLoading,
    setTableLoading,
    tableId,
    page,
  } = useReservations();
  const { id } = useParams();

  const fetchVendor = async () => {
    try {
      setLoading(true);
      const res = await userService.getVendor(id);
      setVendor(res.data);
    } catch (error) {
      console.error('Error fetching vendor:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCombos = async () => {
    try {
      setComboLoading(true);
      const res = await clubService.getBottleSet(id!);
      setComboItems((prev) => {
        const byId = new Map(prev.map((p) => [p._id, p]));
        return res.bottleSets.map((item: any) => ({
          ...item,
          quantity: 0,
          selected: byId.get(item._id)?.selected ?? false,
        }));
      });
    } catch (error) {
      console.error('Error fetching bottle sets:', error);
    } finally {
      setComboLoading(false);
    }
  };

  const fetchBottles = async () => {
    try {
      setBottlesLoading(true);
      const res = await clubService.getDrinks(id!);
      setBottleItems((prev) => {
        const byId = new Map(prev.map((p) => [p._id, p]));
        return res.drinks.map((item: any) => ({
          ...item,
          quantity: byId.get(item._id)?.quantity ?? 0,
        }));
      });
    } catch (error) {
      console.error('Error fetching drinks:', error);
    } finally {
      setBottlesLoading(false);
    }
  };

  const fetchTables = async () => {
    try {
      setTableLoading(true);
      const res = await clubService.getTables(id!);
      setTable((prev) => {
        const byId = new Map(prev.map((p) => [p._id, p]));
        return res.tables.map((item: any) => {
          const persisted = byId.get(item._id);
          const selected = persisted?.selected ?? item._id === tableId;
          return { ...item, quantity: selected ? persisted?.quantity || 1 : 0, selected };
        });
      });
    } catch (error) {
      console.error('Error fetching tables:', error);
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchVendor();
    fetchCombos();
    fetchBottles();
    fetchTables();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="">
      {page === 1 ? <ReservationSummary /> : <ReservationDetails id={id} />}
    </div>
  );
};

export default Reservation;
