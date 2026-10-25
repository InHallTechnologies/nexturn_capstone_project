import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';

export const SearchInput = ({
  value: initialValue = '',
  onChange,
  placeholder = 'Search...',
  debounceMs = 300,
  className = '',
  style,
}) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (value !== initialValue) {
        onChange(value);
      }
    }, debounceMs);

    return () => clearTimeout(handler);
  }, [value, debounceMs, onChange, initialValue]);

  return (
    <div className={`search-input-wrapper ${className}`} style={style}>
      <Search size={16} className="search-input-icon" />
      <input
        type="text"
        className="form-input search-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            setValue('');
            onChange('');
          }}
          style={{
            position: 'absolute',
            right: '0.75rem',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
          }}
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};

export default SearchInput;
