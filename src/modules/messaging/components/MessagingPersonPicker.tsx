"use client";

import { useState } from "react";
import { PersonPicker } from "@/components/ui";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { useMessagingUserSearch, type MessagingSearchResult } from "@/modules/messaging/api/search";

/**
 * Search-to-start-a-new-chat picker — a thin adapter over the shared
 * PersonPicker, the same shape as HrFacultyPicker.tsx. Selecting a person
 * never shows a "selected" chip state (unlike a form field) — `onSelect`
 * fires immediately and the caller switches straight to that conversation,
 * so `value` is always passed as null.
 */
export function MessagingPersonPicker({ onSelect, placeholder = "Search people to message" }: { onSelect: (person: MessagingSearchResult) => void; placeholder?: string }) {
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const debouncedTerm = useDebouncedValue(term, 300);
  const matches = useMessagingUserSearch(open ? debouncedTerm : null);

  return (
    <PersonPicker
      value={null}
      onChange={(person) => {
        if (person) {
          onSelect(person);
          setTerm("");
          setOpen(false);
        }
      }}
      getId={(p: MessagingSearchResult) => p.userId}
      toRow={(p: MessagingSearchResult) => ({ name: p.name, subtitle: p.roleLabel })}
      results={matches.data ?? []}
      isLoading={matches.isLoading}
      term={term}
      onTermChange={setTerm}
      open={open}
      onOpenChange={setOpen}
      placeholder={placeholder}
      emptyMessage="Start typing to find someone."
      noMatchMessage="No one matched that search."
    />
  );
}
