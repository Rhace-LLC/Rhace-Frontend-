import React from 'react';

interface PoliciesProps {
  data?: Record<string, any>;
}

const Policies = ({ data }: PoliciesProps) => {
  return (
    <div>
      <h2 className="type-res-h3 text-res-ink sm:text-lg mb-4">Hotel Policies</h2>
      {data ? (
        <div className="space-y-4">
          {Object.entries(data).map(([key, value]) => (
            <div key={key} className="border-res-line border-b flex gap-1 items-cente pb-3">
              <h3 className="font-medium text-gray-800 capitalize text-sm">
                {key.replace('_', ' ')}.
              </h3>
              <p className="text-gray-600 font-medium text-sm">{value}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-sm">No policies available</p>
      )}
    </div>
  );
};

export default Policies;
