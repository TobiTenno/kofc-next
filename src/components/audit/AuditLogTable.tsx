'use client';

import type { SortDescriptor } from 'react-aria-components';

import {
  Input,
  Label,
  ListBox,
  Pagination,
  Select,
  Table,
  TextField,
} from '@heroui/react';
import { useMemo, useState } from 'react';

const ROWS_PER_PAGE = 25;
const SYSTEM_ACTOR = 'system';

export type AuditEventRow = {
  action: string;
  actorMembershipNumber: null | string;
  createdAt: Date | string;
  id: string;
  metadata: null | Record<string, unknown>;
  summary: string;
};

type AuditLogTableProps = {
  events: AuditEventRow[];
};

const compareStrings = (left: string, right: string): number =>
  left.localeCompare(right, undefined, { sensitivity: 'base' });

const toTimestamp = (value: Date | string): number => {
  const time = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(time) ? time : 0;
};

const actorLabel = (actor: null | string): string =>
  actor?.trim() ? actor : SYSTEM_ACTOR;

const startOfLocalDay = (yyyyMmDd: string): null | number => {
  if (!yyyyMmDd) {
    return null;
  }
  const parsed = Date.parse(`${yyyyMmDd}T00:00:00`);
  return Number.isFinite(parsed) ? parsed : null;
};

const endOfLocalDay = (yyyyMmDd: string): null | number => {
  if (!yyyyMmDd) {
    return null;
  }
  const parsed = Date.parse(`${yyyyMmDd}T23:59:59.999`);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatWhen = (value: Date | string): string => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleString();
};

export const AuditLogTable = ({ events }: AuditLogTableProps) => {
  const [query, setQuery] = useState('');
  const [actorFilter, setActorFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: 'createdAt',
    direction: 'descending',
  });

  const actorOptions = useMemo(() => {
    const actors = new Set<string>();
    for (const event of events) {
      actors.add(actorLabel(event.actorMembershipNumber));
    }
    return [...actors].sort(compareStrings);
  }, [events]);

  const actionOptions = useMemo(() => {
    const actions = new Set<string>();
    for (const event of events) {
      actions.add(event.action);
    }
    return [...actions].sort(compareStrings);
  }, [events]);

  const filteredEvents = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const fromMs = startOfLocalDay(fromDate);
    const toMs = endOfLocalDay(toDate);

    return events.filter((event) => {
      const actor = actorLabel(event.actorMembershipNumber);
      if (actorFilter !== 'all' && actor !== actorFilter) {
        return false;
      }
      if (actionFilter !== 'all' && event.action !== actionFilter) {
        return false;
      }

      const createdMs = toTimestamp(event.createdAt);
      if (fromMs != null && createdMs < fromMs) {
        return false;
      }
      if (toMs != null && createdMs > toMs) {
        return false;
      }

      if (!needle) {
        return true;
      }

      const haystack = [
        event.summary,
        event.action,
        actor,
        event.metadata ? JSON.stringify(event.metadata) : '',
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(needle);
    });
  }, [actionFilter, actorFilter, events, fromDate, query, toDate]);

  const sortedEvents = useMemo(() => {
    const column = String(sortDescriptor.column ?? 'createdAt');
    const direction = sortDescriptor.direction === 'ascending' ? 1 : -1;

    return [...filteredEvents].sort((left, right) => {
      let result = 0;
      switch (column) {
        case 'action': {
          result = compareStrings(left.action, right.action);
          break;
        }
        case 'actor': {
          result = compareStrings(
            actorLabel(left.actorMembershipNumber),
            actorLabel(right.actorMembershipNumber),
          );
          break;
        }
        case 'summary': {
          result = compareStrings(left.summary, right.summary);
          break;
        }
        default: {
          result = toTimestamp(left.createdAt) - toTimestamp(right.createdAt);
          break;
        }
      }
      return result * direction;
    });
  }, [filteredEvents, sortDescriptor]);

  const totalPages = Math.max(
    1,
    Math.ceil(sortedEvents.length / ROWS_PER_PAGE),
  );
  const filterKey = [
    actionFilter,
    actorFilter,
    fromDate,
    query,
    toDate,
  ].join('|');
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  const safePage = Math.min(page, totalPages);
  if (page !== safePage) {
    setPage(safePage);
  }

  const pageStart
    = sortedEvents.length === 0 ? 0 : (safePage - 1) * ROWS_PER_PAGE + 1;
  const pageEnd = Math.min(safePage * ROWS_PER_PAGE, sortedEvents.length);
  const paginatedEvents = sortedEvents.slice(
    (safePage - 1) * ROWS_PER_PAGE,
    safePage * ROWS_PER_PAGE,
  );

  const pages = useMemo(() => {
    const windowSize = 5;
    const start = Math.max(
      1,
      Math.min(
        safePage - Math.floor(windowSize / 2),
        totalPages - windowSize + 1,
      ),
    );
    const end = Math.min(totalPages, start + windowSize - 1);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [safePage, totalPages]);

  return (
    <section className='roster-panel overflow-hidden rounded-lg border border-border bg-card'>
      <div className='roster-filters grid gap-3 border-b border-border p-4 sm:grid-cols-2 lg:grid-cols-5'>
        <TextField className='sm:col-span-2 lg:col-span-1'>
          <Label>Search</Label>
          <Input
            onChange={event => setQuery(event.target.value)}
            placeholder='Summary, action, actor…'
            type='search'
            value={query}
          />
        </TextField>

        <Select
          onSelectionChange={(key) => {
            if (key != null) {
              setActorFilter(String(key));
            }
          }}
          selectedKey={actorFilter}
        >
          <Label>Actor</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id='all' textValue='All actors'>
                All actors
              </ListBox.Item>
              {actorOptions.map(actor => (
                <ListBox.Item id={actor} key={actor} textValue={actor}>
                  {actor}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        <Select
          onSelectionChange={(key) => {
            if (key != null) {
              setActionFilter(String(key));
            }
          }}
          selectedKey={actionFilter}
        >
          <Label>Action</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              <ListBox.Item id='all' textValue='All actions'>
                All actions
              </ListBox.Item>
              {actionOptions.map(action => (
                <ListBox.Item id={action} key={action} textValue={action}>
                  {action}
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        <TextField>
          <Label>From date</Label>
          <Input
            onChange={event => setFromDate(event.target.value)}
            type='date'
            value={fromDate}
          />
        </TextField>

        <TextField>
          <Label>To date</Label>
          <Input
            onChange={event => setToDate(event.target.value)}
            type='date'
            value={toDate}
          />
        </TextField>
      </div>

      <p className='border-b border-border px-4 py-2 text-sm text-muted-foreground'>
        Showing
        {' '}
        {sortedEvents.length === 0 ? 0 : pageStart}
        –
        {pageEnd}
        {' '}
        of
        {' '}
        {sortedEvents.length}
        {' '}
        filtered (
        {events.length}
        {' '}
        loaded)
      </p>

      <Table className='roster-table'>
        <Table.ScrollContainer>
          <Table.Content
            aria-label='Audit log'
            className='min-w-[720px]'
            onSortChange={setSortDescriptor}
            sortDescriptor={sortDescriptor}
          >
            <Table.Header>
              <Table.Column allowsSorting id='createdAt'>
                {({ sortDirection }) => (
                  <Table.SortableColumnHeader sortDirection={sortDirection}>
                    When
                  </Table.SortableColumnHeader>
                )}
              </Table.Column>
              <Table.Column allowsSorting id='actor'>
                {({ sortDirection }) => (
                  <Table.SortableColumnHeader sortDirection={sortDirection}>
                    Actor
                  </Table.SortableColumnHeader>
                )}
              </Table.Column>
              <Table.Column allowsSorting id='action'>
                {({ sortDirection }) => (
                  <Table.SortableColumnHeader sortDirection={sortDirection}>
                    Action
                  </Table.SortableColumnHeader>
                )}
              </Table.Column>
              <Table.Column allowsSorting id='summary' isRowHeader>
                {({ sortDirection }) => (
                  <Table.SortableColumnHeader sortDirection={sortDirection}>
                    Summary
                  </Table.SortableColumnHeader>
                )}
              </Table.Column>
            </Table.Header>
            <Table.Body
              items={paginatedEvents}
              renderEmptyState={() => (
                <div className='p-6 text-center text-muted-foreground'>
                  No audit events match the current filters.
                </div>
              )}
            >
              {event => (
                <Table.Row id={event.id}>
                  <Table.Cell className='whitespace-nowrap text-sm text-muted-foreground'>
                    {formatWhen(event.createdAt)}
                  </Table.Cell>
                  <Table.Cell className='font-mono text-sm'>
                    {actorLabel(event.actorMembershipNumber)}
                  </Table.Cell>
                  <Table.Cell className='font-mono text-sm'>
                    {event.action}
                  </Table.Cell>
                  <Table.Cell className='text-sm'>{event.summary}</Table.Cell>
                </Table.Row>
              )}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
        {sortedEvents.length > 0
          ? (
              <Table.Footer>
                <Pagination size='sm'>
                  <Pagination.Summary>
                    {pageStart}
                    –
                    {pageEnd}
                    {' '}
                    of
                    {sortedEvents.length}
                  </Pagination.Summary>
                  <Pagination.Content>
                    <Pagination.Item>
                      <Pagination.Previous
                        isDisabled={safePage === 1}
                        onPress={() =>
                          setPage(current => Math.max(1, current - 1))}
                      >
                        <Pagination.PreviousIcon />
                        Prev
                      </Pagination.Previous>
                    </Pagination.Item>
                    {pages.map(pageNumber => (
                      <Pagination.Item key={pageNumber}>
                        <Pagination.Link
                          isActive={pageNumber === safePage}
                          onPress={() => setPage(pageNumber)}
                        >
                          {pageNumber}
                        </Pagination.Link>
                      </Pagination.Item>
                    ))}
                    <Pagination.Item>
                      <Pagination.Next
                        isDisabled={safePage === totalPages}
                        onPress={() =>
                          setPage(current => Math.min(totalPages, current + 1))}
                      >
                        Next
                        <Pagination.NextIcon />
                      </Pagination.Next>
                    </Pagination.Item>
                  </Pagination.Content>
                </Pagination>
              </Table.Footer>
            )
          : null}
      </Table>
    </section>
  );
};
