import React from 'react';

const DeviceSelector = ({ devices, selectedDevice, onDeviceChange }) => {
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
