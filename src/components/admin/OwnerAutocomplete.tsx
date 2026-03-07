import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, User, Users, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { includesNormalized } from '@/lib/stringUtils';

interface OwnerOption {
  value: string;
  label: string;
  type: 'user' | 'family';
}

interface OwnerAutocompleteProps {
  options: OwnerOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const OwnerAutocomplete = ({ options, value, onChange, placeholder = "Propriétaire" }: OwnerAutocompleteProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    return options.filter(opt => includesNormalized(opt.label, search));
  }, [options, search]);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selectedOption ? (
            <span className="flex items-center gap-2 truncate">
              {selectedOption.type === 'family' ? (
                <Users className="h-3 w-3 shrink-0" />
              ) : (
                <User className="h-3 w-3 shrink-0" />
              )}
              <span className="truncate">{selectedOption.label}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <div className="flex items-center gap-1 shrink-0">
            {value !== 'all' && (
              <X
                className="h-4 w-4 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('all');
                }}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Rechercher..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>Aucun résultat</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="all"
                onSelect={() => {
                  onChange('all');
                  setOpen(false);
                  setSearch('');
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === 'all' ? "opacity-100" : "opacity-0"
                  )}
                />
                Tous
              </CommandItem>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                    setSearch('');
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.type === 'family' ? (
                    <Users className="mr-2 h-4 w-4" />
                  ) : (
                    <User className="mr-2 h-4 w-4" />
                  )}
                  <span className="truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default OwnerAutocomplete;
