'use client';

import type { Selection } from '@react-types/shared';
import type { SortDescriptor } from 'react-aria-components';

import {
  Alert,
  Button,
  Input,
  Label,
  ListBox,
  Modal,
  Pagination,
  Select,
  Table,
  TextField,
  useOverlayState,
} from '@heroui/react';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { RosterMemberRow } from '@/lib/roster';

import {
  EmailComposeFields,
  type EmailComposeFieldsHandle,
} from '@/components/email/EmailComposeFields';
import { memberClassCodes, memberClassLabels } from '@/lib/member-class';
import { degreeDateFields, getHighestDegreeRank } from '@/lib/member-degrees';

const ROWS_PER_PAGE = 25;

type ActiveFilter = 'active' | 'all' | 'inactive';
type DuesFilter = 'all' | 'paid' | 'unpaid';
type DuesStatus = 'paid' | 'unknown' | 'unpaid';

type RosterDetailRow = {
  children: [];
  id: string;
  member: RosterMemberRow;
  rowType: 'details';
};

type RosterParentRow = RosterMemberRow & {
  children: [RosterDetailRow];
  id: string;
  rowType: 'member';
};

type RosterRowItem = RosterDetailRow | RosterParentRow;

type RosterTableProps = {
  canSendEmail?: boolean;
  councilYear?: null | string;
  members: RosterMemberRow[];
  paidMembershipNumbers?: string[];
  showDuesTools?: boolean;
};

const compareStrings = (left: string, right: string): number =>
  left.localeCompare(right, undefined, { sensitivity: 'base' });

const compareNullableStrings = (
  left: null | string,
  right: null | string,
): number => compareStrings(left ?? '', right ?? '');

const toParentRows = (members: RosterMemberRow[]): RosterParentRow[] =>
  members.map(member => ({
    ...member,
    children: [
      {
        children: [],
        id: `${member.membershipNumber}-details`,
        member,
        rowType: 'details',
      },
    ],
    id: member.membershipNumber,
    rowType: 'member',
  }));

const ChevronRightIcon = ({ className = '' }: { className?: string }) => (
  <svg
    aria-hidden
    className={`size-4 shrink-0 ${className}`}
    fill='currentColor'
    viewBox='0 0 24 24'
  >
    <path d='M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6z' />
  </svg>
);

const RosterCheckbox = ({
  ariaLabel,
  checked,
  indeterminate = false,
  onChange,
}: {
  ariaLabel: string;
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
}) => {
  const stopActivation = (event: React.SyntheticEvent): void => {
    event.stopPropagation();
  };

  return (
    <input
      aria-label={ariaLabel}
      checked={checked}
      className='size-4 shrink-0 cursor-pointer accent-primary'
      onChange={event => onChange(event.target.checked)}
      onClick={stopActivation}
      onMouseDown={stopActivation}
      onPointerDown={stopActivation}
      ref={(element) => {
        if (element) {
          element.indeterminate = indeterminate;
        }
      }}
      type='checkbox'
    />
  );
};

const stopRowActivation = (event: React.SyntheticEvent): void => {
  event.stopPropagation();
};

const getDuesStatus = (
  member: RosterMemberRow,
  paidSet: Set<string>,
): DuesStatus => {
  if (!member.active || !member.memberClass) {
    return 'unknown';
  }

  return paidSet.has(member.membershipNumber) ? 'paid' : 'unpaid';
};

const formatDuesStatus = (status: DuesStatus): string => {
  switch (status) {
    case 'paid': {
      return 'Paid';
    }
    case 'unpaid': {
      return 'Unpaid';
    }
    default: {
      return '—';
    }
  }
};

const BulkEmailForm = ({ members }: { members: RosterMemberRow[] }) => {
  const composeRef = useRef<EmailComposeFieldsHandle>(null);
  const [message, setMessage] = useState<null | string>(null);
  const [messageTone, setMessageTone] = useState<'danger' | 'success'>(
    'success',
  );
  const [loading, setLoading] = useState(false);

  const membersWithEmail = members.filter(member => member.primaryEmail);
  const membershipNumbers = membersWithEmail.map(
    member => member.membershipNumber,
  );
  const isSingle = members.length === 1;
  const singleMember = isSingle ? members[0] : null;

  const submit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);

    const { subject, text } = composeRef.current?.getValues() ?? {
      subject: '',
      text: '',
    };

    const response = await fetch('/api/members/email', {
      body: JSON.stringify(
        isSingle && singleMember
          ? {
              membershipNumber: singleMember.membershipNumber,
              subject,
              text,
            }
          : {
              membershipNumbers,
              subject,
              text,
            },
      ),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });

    setLoading(false);
    const payload = (await response.json()) as {
      error?: string;
      recipientCount?: number;
      recipientEmail?: string;
      skippedCount?: number;
    };

    if (!response.ok) {
      setMessageTone('danger');
      setMessage(payload.error ?? 'Send failed');
      return;
    }

    setMessageTone('success');
    if (isSingle && singleMember) {
      setMessage(
        `Sent to ${payload.recipientEmail ?? singleMember.primaryEmail}.`,
      );
    }
    else {
      const skipped
        = payload.skippedCount && payload.skippedCount > 0
          ? ` (${payload.skippedCount} skipped — no email on file)`
          : '';
      setMessage(
        `Sent to ${payload.recipientCount ?? membershipNumbers.length} member(s).${skipped}`,
      );
    }
    composeRef.current?.reset();
  };

  return (
    <form className='grid gap-4' onSubmit={submit}>
      <EmailComposeFields
        autoFocusSubject
        messageId='roster-email-message'
        ref={composeRef}
        subjectId='roster-email-subject'
      />
      {message
        ? (
            <Alert status={messageTone === 'success' ? 'success' : 'danger'}>
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>{message}</Alert.Description>
              </Alert.Content>
            </Alert>
          )
        : null}
      <div className='flex flex-wrap justify-end gap-2'>
        <Button
          isDisabled={loading || membersWithEmail.length === 0}
          type='submit'
          variant='primary'
        >
          {loading
            ? 'Sending…'
            : (isSingle
                ? 'Send email'
                : `Send to ${membersWithEmail.length} member(s)`)}
        </Button>
      </div>
    </form>
  );
};

const RosterEmailModal = ({
  isOpen,
  members,
  onOpenChange,
}: {
  isOpen: boolean;
  members: RosterMemberRow[];
  onOpenChange: (open: boolean) => void;
}) => {
  const overlay = useOverlayState({
    isOpen,
    onOpenChange,
  });
  const membersWithEmail = members.filter(member => member.primaryEmail);
  const isSingle = members.length === 1;

  return (
    <Modal state={overlay}>
      <Modal.Backdrop variant='blur'>
        <Modal.Container placement='center' size='lg'>
          <Modal.Dialog aria-label='Email roster members'>
            <Modal.Header>
              <Modal.Heading>
                {isSingle
                  ? `Email ${members[0]?.displayName ?? 'member'}`
                  : `Email ${members.length} members`}
              </Modal.Heading>
              <Modal.CloseTrigger />
            </Modal.Header>
            <Modal.Body className='grid gap-3'>
              {isSingle
                ? (
                    <dl className='grid gap-1 text-sm'>
                      <div className='flex flex-wrap gap-x-2'>
                        <dt className='text-muted-foreground'>Number</dt>
                        <dd className='font-mono font-medium'>
                          {members[0]?.membershipNumber}
                        </dd>
                      </div>
                      <div className='flex flex-wrap gap-x-2'>
                        <dt className='text-muted-foreground'>Email</dt>
                        <dd className='break-all font-medium'>
                          {members[0]?.primaryEmail ?? 'No email on file'}
                        </dd>
                      </div>
                    </dl>
                  )
                : (
                    <p className='text-sm text-muted-foreground'>
                      {membersWithEmail.length}
                      {' '}
                      of
                      {members.length}
                      {' '}
                      selected have
                      email on file.
                    </p>
                  )}
              {membersWithEmail.length === 0
                ? (
                    <p className='text-sm text-muted-foreground'>
                      No email on file for the selected member
                      {members.length === 1 ? '' : 's'}
                      .
                    </p>
                  )
                : (
                    <BulkEmailForm members={members} />
                  )}
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

const MemberDetails = ({ member }: { member: RosterMemberRow }) => (
  // biome-ignore lint/a11y/noStaticElementInteractions: prevent table row toggle inside details
  <div
    className='grid gap-3 py-1'
    onClick={stopRowActivation}
    onKeyDown={stopRowActivation}
  >
    <dl className='grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3'>
      <div>
        <dt className='text-muted-foreground'>Highest degree</dt>
        <dd className='font-medium'>{member.highestDegree ?? '—'}</dd>
      </div>
      {degreeDateFields.map(field => (
        <div key={field.key}>
          <dt className='text-muted-foreground'>
            {field.label}
            {' '}
            degree date
          </dt>
          <dd className='font-medium'>{member[field.key]}</dd>
        </div>
      ))}
      <div className='sm:col-span-2 lg:col-span-3'>
        <dt className='text-muted-foreground'>Email</dt>
        <dd className='break-all font-medium'>{member.primaryEmail ?? '—'}</dd>
      </div>
    </dl>
  </div>
);

export const RosterTable = ({
  canSendEmail = false,
  councilYear = null,
  members,
  paidMembershipNumbers = [],
  showDuesTools = false,
}: RosterTableProps) => {
  const [query, setQuery] = useState('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');
  const [degreeFilter, setDegreeFilter] = useState<string>('all');
  const [duesFilter, setDuesFilter] = useState<DuesFilter>('all');
  const [page, setPage] = useState(1);
  const [expandedKeys, setExpandedKeys] = useState<Selection>(() => new Set());
  const [selectedMembershipNumbers, setSelectedMembershipNumbers] = useState<
    Set<string>
  >(() => new Set());
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [sortDescriptor, setSortDescriptor] = useState<SortDescriptor>({
    column: 'displayName',
    direction: 'ascending',
  });

  const enableRowSelection = canSendEmail;
  const paidSet = useMemo(
    () => new Set(paidMembershipNumbers),
    [paidMembershipNumbers],
  );
  const columnCount
    = 6 + (showDuesTools ? 1 : 0) + (enableRowSelection ? 1 : 0);

  useEffect(() => {
    setPage(1);
  }, []);

  const filteredMembers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return members.filter((member) => {
      if (classFilter !== 'all' && member.memberClass !== classFilter) {
        return false;
      }

      if (activeFilter === 'active' && !member.active) {
        return false;
      }

      if (activeFilter === 'inactive' && member.active) {
        return false;
      }

      if (degreeFilter !== 'all') {
        const rank = getHighestDegreeRank({
          firstDegreeDate: member.firstDegreeDateRaw,
          fourthDegreeDate: member.fourthDegreeDateRaw,
          secondDegreeDate: member.secondDegreeDateRaw,
          thirdDegreeDate: member.thirdDegreeDateRaw,
        });
        if (String(rank) !== degreeFilter) {
          return false;
        }
      }

      if (showDuesTools && duesFilter !== 'all') {
        const status = getDuesStatus(member, paidSet);
        if (duesFilter === 'paid' && status !== 'paid') {
          return false;
        }
        if (duesFilter === 'unpaid' && status !== 'unpaid') {
          return false;
        }
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = [
        member.membershipNumber,
        member.displayName,
        member.memberClassLabel,
        member.highestDegree,
        member.primaryEmail,
        member.firstDegreeDate,
        member.secondDegreeDate,
        member.thirdDegreeDate,
        member.fourthDegreeDate,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [
    members,
    query,
    classFilter,
    activeFilter,
    degreeFilter,
    duesFilter,
    showDuesTools,
    paidSet,
  ]);

  const sortedMembers = useMemo(() => {
    const rows = [...filteredMembers];
    const column = String(sortDescriptor.column);

    rows.sort((left, right) => {
      let result = 0;

      switch (column) {
        case 'active': {
          result = Number(left.active) - Number(right.active);
          break;
        }
        case 'displayName': {
          result = compareStrings(left.lastName, right.lastName);
          if (result === 0) {
            result = compareStrings(left.firstName, right.firstName);
          }
          break;
        }
        case 'duesPaid': {
          const leftStatus = getDuesStatus(left, paidSet);
          const rightStatus = getDuesStatus(right, paidSet);
          const rank = (status: DuesStatus): number => {
            if (status === 'paid') {
              return 2;
            }
            if (status === 'unpaid') {
              return 1;
            }
            return 0;
          };
          result = rank(leftStatus) - rank(rightStatus);
          break;
        }
        case 'highestDegree': {
          const leftRank = getHighestDegreeRank({
            firstDegreeDate: left.firstDegreeDateRaw,
            fourthDegreeDate: left.fourthDegreeDateRaw,
            secondDegreeDate: left.secondDegreeDateRaw,
            thirdDegreeDate: left.thirdDegreeDateRaw,
          });
          const rightRank = getHighestDegreeRank({
            firstDegreeDate: right.firstDegreeDateRaw,
            fourthDegreeDate: right.fourthDegreeDateRaw,
            secondDegreeDate: right.secondDegreeDateRaw,
            thirdDegreeDate: right.thirdDegreeDateRaw,
          });
          result = leftRank - rightRank;
          break;
        }
        case 'memberClassLabel': {
          result = compareNullableStrings(
            left.memberClassLabel,
            right.memberClassLabel,
          );
          break;
        }
        case 'membershipNumber': {
          result = compareStrings(
            left.membershipNumber,
            right.membershipNumber,
          );
          break;
        }
        case 'primaryEmail': {
          result = compareNullableStrings(
            left.primaryEmail,
            right.primaryEmail,
          );
          break;
        }
        default: {
          result = 0;
        }
      }

      return sortDescriptor.direction === 'descending' ? -result : result;
    });

    return rows;
  }, [filteredMembers, sortDescriptor, paidSet]);

  const totalPages = Math.max(
    1,
    Math.ceil(sortedMembers.length / ROWS_PER_PAGE),
  );
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    if (page !== safePage) {
      setPage(safePage);
    }
  }, [page, safePage]);

  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * ROWS_PER_PAGE;
    return toParentRows(sortedMembers.slice(start, start + ROWS_PER_PAGE));
  }, [sortedMembers, safePage]);

  const pageStart
    = sortedMembers.length === 0 ? 0 : (safePage - 1) * ROWS_PER_PAGE + 1;
  const pageEnd = Math.min(safePage * ROWS_PER_PAGE, sortedMembers.length);
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  const selectedMembers = useMemo(
    () =>
      members.filter(member =>
        selectedMembershipNumbers.has(member.membershipNumber),
      ),
    [members, selectedMembershipNumbers],
  );

  const filteredMembershipNumbers = useMemo(
    () => sortedMembers.map(member => member.membershipNumber),
    [sortedMembers],
  );

  const pageMembershipNumbers = useMemo(
    () => paginatedRows.map(row => row.membershipNumber),
    [paginatedRows],
  );

  const allFilteredSelected
    = filteredMembershipNumbers.length > 0
      && filteredMembershipNumbers.every(membershipNumber =>
        selectedMembershipNumbers.has(membershipNumber),
      );

  const allPageSelected
    = pageMembershipNumbers.length > 0
      && pageMembershipNumbers.every(membershipNumber =>
        selectedMembershipNumbers.has(membershipNumber),
      );

  const somePageSelected = pageMembershipNumbers.some(membershipNumber =>
    selectedMembershipNumbers.has(membershipNumber),
  );

  const toggleMemberSelected = (
    membershipNumber: string,
    checked: boolean,
  ): void => {
    setSelectedMembershipNumbers((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(membershipNumber);
      }
      else {
        next.delete(membershipNumber);
      }
      return next;
    });
  };

  const setSelectionForMembershipNumbers = (
    membershipNumbers: string[],
    checked: boolean,
  ): void => {
    setSelectedMembershipNumbers((current) => {
      const next = new Set(current);
      for (const membershipNumber of membershipNumbers) {
        if (checked) {
          next.add(membershipNumber);
        }
        else {
          next.delete(membershipNumber);
        }
      }
      return next;
    });
  };

  const toggleRowExpanded = (rowId: string): void => {
    setExpandedKeys((current) => {
      const keys
        = current === 'all'
          ? new Set<string>()
          : new Set(current as Iterable<string>);

      if (keys.has(rowId)) {
        keys.delete(rowId);
      }
      else {
        keys.add(rowId);
      }

      return keys;
    });
  };

  const renderRow = (item: RosterRowItem) => {
    if (item.rowType === 'details') {
      return (
        <Table.Row
          id={item.id}
          textValue={`Details for ${item.member.displayName}`}
        >
          <Table.Cell colSpan={columnCount}>
            <MemberDetails member={item.member} />
          </Table.Cell>
        </Table.Row>
      );
    }

    const isExpanded
      = expandedKeys !== 'all'
        && (expandedKeys as Set<string>).has(item.membershipNumber);
    const duesStatus = getDuesStatus(item, paidSet);
    const isSelected = selectedMembershipNumbers.has(item.membershipNumber);
    const selectedCellClass = isSelected ? 'roster-cell--selected' : undefined;

    return (
      <Table.Row
        aria-selected={isSelected}
        className='touch-manipulation'
        id={item.id}
        textValue={item.displayName}
      >
        {enableRowSelection
          ? (
              <Table.Cell
                className={['w-10', selectedCellClass].filter(Boolean).join(' ')}
                data-selected={isSelected || undefined}
                onClick={stopRowActivation}
                onMouseDown={stopRowActivation}
                onPointerDown={stopRowActivation}
              >
                <RosterCheckbox
                  ariaLabel={`Select ${item.displayName}`}
                  checked={isSelected}
                  onChange={checked =>
                    toggleMemberSelected(item.membershipNumber, checked)}
                />
              </Table.Cell>
            )
          : null}
        <Table.Cell
          className={['cursor-pointer', selectedCellClass]
            .filter(Boolean)
            .join(' ')}
          data-selected={isSelected || undefined}
          onClick={() => toggleRowExpanded(item.id)}
          textValue={item.membershipNumber}
        >
          <span className='flex min-w-0 items-center gap-2'>
            <ChevronRightIcon
              className={`shrink-0 text-muted-foreground transition-transform duration-150 ${
                isExpanded ? 'rotate-90' : ''
              }`}
            />
            <span className='font-mono text-xs sm:text-sm'>
              {item.membershipNumber}
            </span>
          </span>
        </Table.Cell>
        <Table.Cell
          className={['cursor-pointer', selectedCellClass]
            .filter(Boolean)
            .join(' ')}
          data-selected={isSelected || undefined}
          onClick={() => toggleRowExpanded(item.id)}
          textValue={item.displayName}
        >
          <span className='truncate'>{item.displayName}</span>
        </Table.Cell>
        <Table.Cell
          className={selectedCellClass}
          data-selected={isSelected || undefined}
          textValue={item.memberClassLabel ?? ''}
        >
          {item.memberClassLabel ?? '—'}
        </Table.Cell>
        <Table.Cell
          className={['hidden sm:table-cell', selectedCellClass]
            .filter(Boolean)
            .join(' ')}
          data-selected={isSelected || undefined}
          textValue={item.highestDegree ?? ''}
        >
          {item.highestDegree ?? '—'}
        </Table.Cell>
        <Table.Cell
          className={['hidden md:table-cell', selectedCellClass]
            .filter(Boolean)
            .join(' ')}
          data-selected={isSelected || undefined}
          textValue={item.primaryEmail ?? ''}
        >
          <span className='break-all'>{item.primaryEmail ?? '—'}</span>
        </Table.Cell>
        {showDuesTools
          ? (
              <Table.Cell
                className={selectedCellClass}
                data-selected={isSelected || undefined}
                textValue={formatDuesStatus(duesStatus)}
              >
                <span
                  className={
                    duesStatus === 'paid'
                      ? 'font-medium text-emerald-700 dark:text-emerald-400'
                      : (duesStatus === 'unpaid'
                          ? 'font-medium text-red-600 dark:text-red-400'
                          : 'text-muted-foreground')
                  }
                >
                  {formatDuesStatus(duesStatus)}
                </span>
              </Table.Cell>
            )
          : null}
        <Table.Cell
          className={selectedCellClass}
          data-selected={isSelected || undefined}
          textValue={item.active ? 'Active' : 'Inactive'}
        >
          {item.active ? 'Yes' : 'No'}
        </Table.Cell>
        <Table.Collection items={item.children}>{renderRow}</Table.Collection>
      </Table.Row>
    );
  };

  return (
    <div className='grid gap-4'>
      <section className='roster-panel overflow-hidden rounded-lg border border-border bg-card'>
        <div
          className={`roster-filters grid gap-3 border-b border-border p-4 sm:grid-cols-2 ${
            showDuesTools ? 'lg:grid-cols-5' : 'lg:grid-cols-4'
          }`}
        >
          <TextField className='sm:col-span-2 lg:col-span-1'>
            <Label>Search</Label>
            <Input
              onChange={event => setQuery(event.target.value)}
              placeholder='Name, number, email…'
              type='search'
              value={query}
            />
          </TextField>

          <Select
            onSelectionChange={(key) => {
              if (key != null) {
                setClassFilter(String(key));
              }
            }}
            selectedKey={classFilter}
          >
            <Label>Class</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id='all' textValue='All classes'>
                  All classes
                </ListBox.Item>
                {memberClassCodes.map(code => (
                  <ListBox.Item
                    id={code}
                    key={code}
                    textValue={memberClassLabels[code]}
                  >
                    {memberClassLabels[code]}
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>

          <Select
            onSelectionChange={(key) => {
              if (key != null) {
                setDegreeFilter(String(key));
              }
            }}
            selectedKey={degreeFilter}
          >
            <Label>Degree</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id='all' textValue='All degrees'>
                  All degrees
                </ListBox.Item>
                <ListBox.Item id='4' textValue='4th Degree'>
                  4th Degree
                </ListBox.Item>
                <ListBox.Item id='3' textValue='3rd Degree'>
                  3rd Degree
                </ListBox.Item>
                <ListBox.Item id='2' textValue='2nd Degree'>
                  2nd Degree
                </ListBox.Item>
                <ListBox.Item id='1' textValue='1st Degree'>
                  1st Degree
                </ListBox.Item>
                <ListBox.Item id='0' textValue='None'>
                  None
                </ListBox.Item>
              </ListBox>
            </Select.Popover>
          </Select>

          <Select
            onSelectionChange={(key) => {
              if (key != null) {
                setActiveFilter(String(key) as ActiveFilter);
              }
            }}
            selectedKey={activeFilter}
          >
            <Label>Status</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id='all' textValue='All members'>
                  All members
                </ListBox.Item>
                <ListBox.Item id='active' textValue='Active only'>
                  Active only
                </ListBox.Item>
                <ListBox.Item id='inactive' textValue='Inactive only'>
                  Inactive only
                </ListBox.Item>
              </ListBox>
            </Select.Popover>
          </Select>

          {showDuesTools
            ? (
                <Select
                  onSelectionChange={(key) => {
                    if (key != null) {
                      setDuesFilter(String(key) as DuesFilter);
                    }
                  }}
                  selectedKey={duesFilter}
                >
                  <Label>
                    Dues
                    {councilYear ? ` (${councilYear})` : ''}
                  </Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      <ListBox.Item id='all' textValue='All dues statuses'>
                        All dues statuses
                      </ListBox.Item>
                      <ListBox.Item id='paid' textValue='Paid'>
                        Paid
                      </ListBox.Item>
                      <ListBox.Item id='unpaid' textValue='Unpaid'>
                        Unpaid
                      </ListBox.Item>
                    </ListBox>
                  </Select.Popover>
                </Select>
              )
            : null}
        </div>

        <p className='border-b border-border px-4 py-2 text-sm text-muted-foreground'>
          Showing
          {' '}
          {sortedMembers.length === 0 ? 0 : pageStart}
          –
          {pageEnd}
          {' '}
          of
          {' '}
          {sortedMembers.length}
          {' '}
          filtered (
          {members.length}
          {' '}
          total)
        </p>

        <Table className='roster-table'>
          <Table.ScrollContainer>
            <Table.Content
              aria-label='Council roster'
              className='min-w-[640px]'
              expandedKeys={expandedKeys}
              onExpandedChange={setExpandedKeys}
              onSortChange={setSortDescriptor}
              sortDescriptor={sortDescriptor}
            >
              <Table.Header>
                {enableRowSelection
                  ? (
                      <Table.Column className='w-10'>
                        <RosterCheckbox
                          ariaLabel='Select all members on this page'
                          checked={allPageSelected}
                          indeterminate={!allPageSelected && somePageSelected}
                          onChange={checked =>
                            setSelectionForMembershipNumbers(
                              pageMembershipNumbers,
                              checked,
                            )}
                        />
                      </Table.Column>
                    )
                  : null}
                <Table.Column allowsSorting id='membershipNumber'>
                  {({ sortDirection }) => (
                    <Table.SortableColumnHeader sortDirection={sortDirection}>
                      Number
                    </Table.SortableColumnHeader>
                  )}
                </Table.Column>
                <Table.Column allowsSorting id='displayName' isRowHeader>
                  {({ sortDirection }) => (
                    <Table.SortableColumnHeader sortDirection={sortDirection}>
                      Name
                    </Table.SortableColumnHeader>
                  )}
                </Table.Column>
                <Table.Column allowsSorting id='memberClassLabel'>
                  {({ sortDirection }) => (
                    <Table.SortableColumnHeader sortDirection={sortDirection}>
                      Class
                    </Table.SortableColumnHeader>
                  )}
                </Table.Column>
                <Table.Column
                  allowsSorting
                  className='hidden sm:table-cell'
                  id='highestDegree'
                >
                  {({ sortDirection }) => (
                    <Table.SortableColumnHeader sortDirection={sortDirection}>
                      Degree
                    </Table.SortableColumnHeader>
                  )}
                </Table.Column>
                <Table.Column
                  allowsSorting
                  className='hidden md:table-cell'
                  id='primaryEmail'
                >
                  {({ sortDirection }) => (
                    <Table.SortableColumnHeader sortDirection={sortDirection}>
                      Email
                    </Table.SortableColumnHeader>
                  )}
                </Table.Column>
                {showDuesTools
                  ? (
                      <Table.Column allowsSorting id='duesPaid'>
                        {({ sortDirection }) => (
                          <Table.SortableColumnHeader sortDirection={sortDirection}>
                            Dues
                          </Table.SortableColumnHeader>
                        )}
                      </Table.Column>
                    )
                  : null}
                <Table.Column allowsSorting id='active'>
                  {({ sortDirection }) => (
                    <Table.SortableColumnHeader sortDirection={sortDirection}>
                      Active
                    </Table.SortableColumnHeader>
                  )}
                </Table.Column>
              </Table.Header>
              <Table.Body
                items={paginatedRows}
                key={[...selectedMembershipNumbers].sort().join(',')}
                renderEmptyState={() => (
                  <div className='p-6 text-center text-muted-foreground'>
                    No members match the current filters.
                  </div>
                )}
              >
                {renderRow}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
          {sortedMembers.length > 0
            ? (
                <Table.Footer>
                  <Pagination size='sm'>
                    <Pagination.Summary>
                      {pageStart}
                      –
                      {pageEnd}
                      {' '}
                      of
                      {sortedMembers.length}
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

      {enableRowSelection
        ? (
            <>
              <div className='pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]'>
                <div className='pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-2 rounded-lg border border-border bg-card/95 px-3 py-2 text-sm shadow-lg backdrop-blur-sm sm:gap-3 sm:px-4'>
                  <Button
                    onPress={() =>
                      setSelectionForMembershipNumbers(
                        filteredMembershipNumbers,
                        !allFilteredSelected,
                      )}
                    size='sm'
                    type='button'
                    variant='ghost'
                  >
                    {allFilteredSelected
                      ? 'Deselect all filtered'
                      : 'Select all filtered'}
                  </Button>
                  <Button
                    onPress={() =>
                      setSelectionForMembershipNumbers(
                        pageMembershipNumbers,
                        !allPageSelected,
                      )}
                    size='sm'
                    type='button'
                    variant='ghost'
                  >
                    {allPageSelected ? 'Deselect page' : 'Select page'}
                  </Button>
                  {selectedMembershipNumbers.size > 0
                    ? (
                        <>
                          <span className='text-muted-foreground'>
                            {selectedMembershipNumbers.size}
                            {' '}
                            selected
                          </span>
                          <Button
                            onPress={() => setEmailModalOpen(true)}
                            size='sm'
                            type='button'
                            variant='primary'
                          >
                            Email selected
                          </Button>
                          <Button
                            onPress={() => setSelectedMembershipNumbers(new Set())}
                            size='sm'
                            type='button'
                            variant='ghost'
                          >
                            Clear selection
                          </Button>
                        </>
                      )
                    : null}
                </div>
              </div>
              <div aria-hidden className='h-16' />
              <RosterEmailModal
                isOpen={emailModalOpen}
                members={selectedMembers}
                onOpenChange={setEmailModalOpen}
              />
            </>
          )
        : null}
    </div>
  );
};
