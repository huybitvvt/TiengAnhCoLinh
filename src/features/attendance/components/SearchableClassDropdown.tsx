/**
 * SearchableClassDropdown Component
 *
 * - Picker: chọn một lớp (điểm danh, báo cáo…)
 * - Filter: lọc ALL | NO_CLASS | classId + gõ tìm theo tên/GV/cơ sở lớp
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';
import { ClassModel } from '../../../../types';

type DropdownRow =
  | { kind: 'special'; value: string; label: string }
  | { kind: 'class'; id: string; data: ClassModel };

export interface SearchableClassDropdownProps {
  classes: ClassModel[];
  /** Chế độ chọn lớp (mặc định) */
  selectedClassId?: string;
  onSelect?: (classId: string) => void;
  /** Chế độ lọc danh sách: ALL | NO_CLASS | classId */
  filterValue?: string;
  onFilterChange?: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  /** Class cho ô input (mặc định w-[280px]) */
  inputClassName?: string;
  /** Ẩn select lọc cơ sở trong dropdown (vd. trang HV đã có filter cơ sở riêng) */
  hideBranchFilter?: boolean;
}

export const SearchableClassDropdown: React.FC<SearchableClassDropdownProps> = ({
  classes,
  selectedClassId = '',
  onSelect,
  filterValue = 'ALL',
  onFilterChange,
  disabled = false,
  placeholder = 'Tìm kiếm lớp...',
  className = '',
  inputClassName = 'w-[280px]',
  hideBranchFilter = false,
}) => {
  const isFilterMode = typeof onFilterChange === 'function';

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 280 });

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [isOpen]);

  const selectedClass = useMemo(
    () => classes.find(c => c.id === selectedClassId),
    [classes, selectedClassId]
  );

  const availableBranches = useMemo(() => {
    const branches = new Set<string>();
    classes.forEach(c => {
      if (c.branch) branches.add(c.branch);
    });
    return Array.from(branches).sort();
  }, [classes]);

  const filteredClasses = useMemo(() => {
    let result = classes;

    if (selectedBranch) {
      result = result.filter(c => c.branch === selectedBranch);
    }

    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      result = result.filter(
        c =>
          c.name.toLowerCase().includes(searchLower) ||
          c.teacher?.toLowerCase().includes(searchLower) ||
          c.branch?.toLowerCase().includes(searchLower)
      );
    }

    return result;
  }, [classes, selectedBranch, searchTerm]);

  const SPECIAL_FILTER: { value: string; label: string }[] = useMemo(
    () => [
      { value: 'ALL', label: 'Tất cả lớp' },
      { value: 'NO_CLASS', label: 'Chưa có lớp' },
    ],
    []
  );

  const dropdownRows: DropdownRow[] = useMemo(() => {
    if (isFilterMode) {
      const q = searchTerm.toLowerCase().trim();
      const specials: DropdownRow[] = q
        ? SPECIAL_FILTER.filter(
            s => s.label.toLowerCase().includes(q) || s.value.toLowerCase().includes(q)
          ).map(s => ({ kind: 'special' as const, value: s.value, label: s.label }))
        : SPECIAL_FILTER.map(s => ({ kind: 'special' as const, value: s.value, label: s.label }));
      const classRows: DropdownRow[] = filteredClasses.map(c => ({
        kind: 'class',
        id: c.id,
        data: c,
      }));
      return [...specials, ...classRows];
    }
    return filteredClasses.map(c => ({ kind: 'class', id: c.id, data: c }));
  }, [isFilterMode, SPECIAL_FILTER, searchTerm, filteredClasses]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const closeList = () => {
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const pickClass = (classId: string) => {
    onSelect?.(classId);
    closeList();
    setSearchTerm('');
  };

  const pickFilter = (value: string) => {
    onFilterChange?.(value);
    closeList();
    setSearchTerm('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const len = dropdownRows.length;

    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        setHighlightedIndex(len > 0 ? 0 : -1);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => (prev < len - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : len - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < len) {
          const row = dropdownRows[highlightedIndex];
          if (row.kind === 'special') pickFilter(row.value);
          else pickClass(row.id);
        }
        break;
      case 'Escape':
        closeList();
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const el = listRef.current.children[highlightedIndex] as HTMLElement;
      el?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  const handleClearPicker = () => {
    onSelect?.('');
    setSearchTerm('');
    setSelectedBranch('');
  };

  const handleClearFilter = () => {
    onFilterChange?.('ALL');
    setSearchTerm('');
    setSelectedBranch('');
  };

  const handleBranchChange = (branch: string) => {
    setSelectedBranch(branch);
    if (isFilterMode) {
      if (filterValue && filterValue !== 'ALL' && filterValue !== 'NO_CLASS') {
        const currentClass = classes.find(c => c.id === filterValue);
        if (branch && currentClass?.branch !== branch) {
          onFilterChange?.('ALL');
        }
      }
    } else if (selectedClassId) {
      const currentClass = classes.find(c => c.id === selectedClassId);
      if (branch && currentClass?.branch !== branch) {
        onSelect?.('');
      }
    }
    setSearchTerm('');
  };

  const closedInputValue = (): string => {
    if (isOpen) return searchTerm;
    if (isFilterMode) {
      if (filterValue === 'ALL') return 'Tất cả lớp';
      if (filterValue === 'NO_CLASS') return 'Chưa có lớp';
      return classes.find(c => c.id === filterValue)?.name || 'Tất cả lớp';
    }
    return selectedClass?.name || '';
  };

  const showClear =
    !isOpen &&
    (isFilterMode ? filterValue !== 'ALL' : !!selectedClassId);

  const showChevron = isFilterMode ? filterValue === 'ALL' && !isOpen : !selectedClassId;

  const inputCls = `px-3 py-2 pl-9 pr-8 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${inputClassName}`;

  return (
    <div className={`flex gap-2 ${className}`}>
      {availableBranches.length > 0 && !hideBranchFilter && (
        <select
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm min-w-[140px] focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          value={selectedBranch}
          onChange={e => handleBranchChange(e.target.value)}
          disabled={disabled}
        >
          <option value="">Tất cả cơ sở</option>
          {availableBranches.map(branch => (
            <option key={branch} value={branch}>
              {branch}
            </option>
          ))}
        </select>
      )}

      <div ref={containerRef} className="relative">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            placeholder={placeholder}
            className={inputCls}
            value={closedInputValue()}
            onChange={e => {
              setSearchTerm(e.target.value);
              setHighlightedIndex(0);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => {
              setIsOpen(true);
              if (isFilterMode) {
                if (filterValue === 'ALL' || filterValue === 'NO_CLASS') setSearchTerm('');
                else setSearchTerm('');
              } else if (selectedClass) {
                setSearchTerm('');
              }
            }}
            onKeyDown={handleKeyDown}
            disabled={disabled}
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />

          {showClear && (
            <button
              type="button"
              onClick={isFilterMode ? handleClearFilter : handleClearPicker}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
              tabIndex={-1}
            >
              <X size={14} />
            </button>
          )}

          {showChevron && (
            <ChevronDown
              className={`absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 transition-transform pointer-events-none ${isOpen ? 'rotate-180' : ''}`}
              size={16}
            />
          )}
        </div>

        {isOpen && (
          <div
            ref={listRef}
            style={{
              position: 'fixed',
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width,
              zIndex: 99999,
            }}
            className="bg-white border border-gray-300 rounded-lg shadow-2xl max-h-[300px] overflow-y-auto"
          >
            {dropdownRows.length === 0 ? (
              <div className="px-3 py-3 text-sm text-gray-500 text-center">
                Không tìm thấy lớp nào
                {searchTerm && (
                  <p className="text-xs text-gray-400 mt-1">Thử từ khóa khác</p>
                )}
              </div>
            ) : (
              dropdownRows.map((row, index) => {
                if (row.kind === 'special') {
                  const active = filterValue === row.value;
                  return (
                    <button
                      key={row.value}
                      type="button"
                      onClick={() => pickFilter(row.value)}
                      className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                        index === highlightedIndex
                          ? 'bg-indigo-100 text-indigo-700'
                          : active
                            ? 'bg-indigo-50 font-medium'
                            : 'hover:bg-gray-50'
                      }`}
                    >
                      {row.label}
                    </button>
                  );
                }
                const c = row.data;
                const active = !isFilterMode && selectedClassId === c.id;
                const activeFilter = isFilterMode && filterValue === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => (isFilterMode ? pickFilter(c.id) : pickClass(c.id))}
                    className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between transition-colors ${
                      index === highlightedIndex
                        ? 'bg-indigo-100 text-indigo-700'
                        : active || activeFilter
                          ? 'bg-indigo-50'
                          : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-medium truncate block">{c.name}</span>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                        {c.branch && <span>{c.branch}</span>}
                        {c.branch && c.schedule && <span>•</span>}
                        {c.schedule && <span className="truncate">{c.schedule}</span>}
                      </div>
                    </div>
                    {c.teacher && (
                      <span className="text-xs text-gray-400 ml-2 whitespace-nowrap">{c.teacher}</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchableClassDropdown;
