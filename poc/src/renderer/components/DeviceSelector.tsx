import React, { ChangeEvent } from 'react';

interface AudioDevice {
  id: string;
  label: string;
}

interface DeviceSelectorProps {
  devices: AudioDevice[];
  selectedDevice: string;
  onDeviceChange: (event: ChangeEvent<HTMLSelectElement>) => void;
}

const DeviceSelector: React.FC<DeviceSelectorProps> = ({ 
  devices, 
  selectedDevice, 
  onDeviceChange 
}) => {
  return (
    <div className="device-selector">
      <label htmlFor="device-select">
        Audio Device (for system audio, select BlackHole):
      </label>
      <select 
        id="device-select" 
        value={selectedDevice} 
        onChange={onDeviceChange}
      >
        {devices.map(device => (
          <option key={device.id} value={device.id}>
            {device.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default DeviceSelector;
