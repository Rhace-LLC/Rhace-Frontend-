import { FiChevronRight } from 'react-icons/fi';
import { Button } from '@/components/ui/button';

export const SectionHeader = ({ title }: { title: string }) => (
  <Button
    variant="outline"
    className="flex cursor-pointer bg-transparent sm:bg-white justify-between items-center sm:mb-6 w-auto text-gray-900 text-sm sm:text-base font-medium leading-none border-0 md:border shadow-none"
  >
    <h2 className="">{title}</h2>
    <FiChevronRight className="ml-1 sm:ml-2" />
  </Button>
);
