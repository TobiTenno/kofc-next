'use client';

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
import type { Selection } from '@react-types/shared';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { SortDescriptor } from 'react-aria-components';
import {
  EmailComposeFields,
  type EmailComposeFieldsHandle,
} from '@/components/email/EmailComposeFields';
import { memberClassCodes, memberClassLabels } from '@/lib/member-class';
import { degreeDateFields, getHighestDegreeRank } from '@/lib/member-degrees';
import type { RosterMemberRow } from '@/lib/roster';

const ROWS_PER_PAGE = 25;

type ActiveFilter = 'all' | 'active' | 'inactive';
type DuesFilter = 'all' | 'paid' | 'unpaid';
type DuesStatus = 'paid' | 'unpaid' | 'unknown';

type RosterDetailRow = {
  rowType: 'details';
  id: string;
  member: RosterMemberRow;
  children: [];
};

type RosterParentRow = RosterMemberRow & {
  rowType: 'member';
  id: string;
  children: [RosterDetailRow];
};

type RosterRowItem = RosterParentRow | RosterDetailRow;

type RosterTableProps = {
  members: RosterMemberRow[];
  canSendEmail?: boolean;
  showDuesTools?: boolean;
  councilYear?: string | null;
  paidMembershipNumbers?: string[];
};

const compareStrings = (left: string, right: string): number =>
  left.localeCompare(right, undefined, { sensitivity: 'base' });

const compareNullableStrings = (
  left: string | null,
  right: string | null,
): number => compareStrings(left ?? '', right ?? '');

const toParentRows = (members: RosterMemberRow[]): RosterParentRow[] =>
  members.map((member) => ({
    ...member,
    rowType: 'member',
    id: member.membershipNumber,
    children: [
      {
        rowType: 'details',
        id: `${member.membershipNumber}-details`,
        member,
        children: [],
      },
    ],
  }));

const ChevronRightIcon = ({ className = '' }: { className?: string }) => (
  <svg
    aria-hidden
    className={`size-4 shrink-0 ${className}`}
    viewBox='0 0 24 24'
    fill='currentColor'
  >
    <path d='M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6z' />
  </svg>
);

const RosterCheckbox = ({
  checked,
  indeterminate = false,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  ariaLabel: string;
}) => {
  const stopActivation = (event: React.SyntheticEvent): void => {
    event.stopPropagation();
  };

  return (
    <input
      type='checkbox'
      aria-label={ariaLabel}
      checked={checked}
      ref={(element) => {
        if (element) {
          element.indeterminate = indeterminate;
        }
      }}
      onChange={(event) => onChange(event.target.checked)}
      onClick={stopActivation}
      onPointerDown={stopActivation}
      onMouseDown={stopActivation}
      className='size-4 shrink-0 cursor-pointer accent-primary'
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
    case 'paid':
      return 'Paid';
    case 'unpaid':
      return 'Unpaid';
    default:
      return '—';
  }
};

const BulkEmailForm = ({ members }: { members: RosterMemberRow[] }) => {
  const composeRef = useRef<EmailComposeFieldsHandle>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<'success' | 'danger'>(
    'success',
  );
  const [loading, setLoading] = useState(false);

  const membersWithEmail = members.filter((member) => member.primaryEmail);
  const membershipNumbers = membersWithEmail.map(
    (member) => member.membershipNumber,
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
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        isSingle && singleMember
          ? {
              subject,
              text,
              membershipNumber: singleMember.membershipNumber,
            }
          : {
              subject,
              text,
              membershipNumbers,
            },
      ),
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
    } else {
      const skipped =
        payload.skippedCount && payload.skippedCount > 0
          ? ` (${payload.skippedCount} skipped — no email on file)`
          : '';
      setMessage(
        `Sent to ${payload.recipientCount ?? membershipNumbers.length} member(s).${skipped}`,
      );
    }
    composeRef.current?.reset();
  };

  return (
    <form onSubmit={submit} className='grid gap-4'>
      <EmailComposeFields
        ref={composeRef}
        subjectId='roster-email-subject'
        messageId='roster-email-message'
        autoFocusSubject
      />
      {message ? (
        <Alert status={messageTone === 'success' ? 'success' : 'danger'}>
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{message}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}
      <div className='flex flex-wrap justify-end gap-2'>
        <Button
          type='submit'
          variant='primary'
          isDisabled={loading || membersWithEmail.length === 0}
        >
          {loading
            ? 'Sending…'
            : isSingle
              ? 'Send email'
              : `Send to ${membersWithEmail.length} member(s)`}
        </Button>
      </div>
    </form>
  );
};

const RosterEmailModal = ({
  members,
  isOpen,
  onOpenChange,
}: {
  members: RosterMemberRow[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const overlay = useOverlayState({
    isOpen,
    onOpenChange,
  });
  const membersWithEmail = members.filter((member) => member.primaryEmail);
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
              {isSingle ? (
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
              ) : (
                <p className='text-sm text-muted-foreground'>
                  {membersWithEmail.length} of {members.length} selected have
                  email on file.
                </p>
              )}
              {membersWithEmail.length === 0 ? (
                <p className='text-sm text-muted-foreground'>
                  No email on file for the selected member
                  {members.length === 1 ? '' : 's'}.
                </p>
              ) : (
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
      {degreeDateFields.map((field) => (
        <div key={field.key}>
          <dt className='text-muted-foreground'>{field.label} degree date</dt>
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
  members,
  canSendEmail = false,
  showDuesTools = false,
  councilYear = null,
  paidMembershipNumbers = [],
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
  const columnCount =
    5 + (showDuesTools ? 1 : 0) + (enableRowSelection ? 1 : 0);

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
          secondDegreeDate: member.secondDegreeDateRaw,
          thirdDegreeDate: member.thirdDegreeDateRaw,
          fourthDegreeDate: member.fourthDegreeDateRaw,
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
        case 'membershipNumber':
          result = compareStrings(
            left.membershipNumber,
            right.membershipNumber,
          );
          break;
        case 'displayName':
          result = compareStrings(left.displayName, right.displayName);
          break;
        case 'memberClassLabel':
          result = compareNullableStrings(
            left.memberClassLabel,
            right.memberClassLabel,
          );
          break;
        case 'highestDegree': {
          const leftRank = getHighestDegreeRank({
            firstDegreeDate: left.firstDegreeDateRaw,
            secondDegreeDate: left.secondDegreeDateRaw,
            thirdDegreeDate: left.thirdDegreeDateRaw,
            fourthDegreeDate: left.fourthDegreeDateRaw,
          });
          const rightRank = getHighestDegreeRank({
            firstDegreeDate: right.firstDegreeDateRaw,
            secondDegreeDate: right.secondDegreeDateRaw,
            thirdDegreeDate: right.thirdDegreeDateRaw,
            fourthDegreeDate: right.fourthDegreeDateRaw,
          });
          result = leftRank - rightRank;
          break;
        }
        case 'primaryEmail':
          result = compareNullableStrings(
            left.primaryEmail,
            right.primaryEmail,
          );
          break;
        case 'active':
          result = Number(left.active) - Number(right.active);
          break;
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
        default:
          result = 0;
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

  const pageStart =
    sortedMembers.length === 0 ? 0 : (safePage - 1) * ROWS_PER_PAGE + 1;
  const pageEnd = Math.min(safePage * ROWS_PER_PAGE, sortedMembers.length);
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  const selectedMembers = useMemo(
    () =>
      members.filter((member) =>
        selectedMembershipNumbers.has(member.membershipNumber),
      ),
    [members, selectedMembershipNumbers],
  );

  const filteredMembershipNumbers = useMemo(
    () => sortedMembers.map((member) => member.membershipNumber),
    [sortedMembers],
  );

  const pageMembershipNumbers = useMemo(
    () => paginatedRows.map((row) => row.membershipNumber),
    [paginatedRows],
  );

  const allFilteredSelected =
    filteredMembershipNumbers.length > 0 &&
    filteredMembershipNumbers.every((membershipNumber) =>
      selectedMembershipNumbers.has(membershipNumber),
    );

  const allPageSelected =
    pageMembershipNumbers.length > 0 &&
    pageMembershipNumbers.every((membershipNumber) =>
      selectedMembershipNumbers.has(membershipNumber),
    );

  const somePageSelected = pageMembershipNumbers.some((membershipNumber) =>
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
      } else {
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
        } else {
          next.delete(membershipNumber);
        }
      }
      return next;
    });
  };

  const toggleRowExpanded = (rowId: string): void => {
    setExpandedKeys((current) => {
      const keys =
        current === 'all'
          ? new Set<string>()
          : new Set(current as Iterable<string>);

      if (keys.has(rowId)) {
        keys.delete(rowId);
      } else {
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

    const isExpanded =
      expandedKeys !== 'all' &&
      (expandedKeys as Set<string>).has(item.membershipNumber);
    const duesStatus = getDuesStatus(item, paidSet);
    const isSelected = selectedMembershipNumbers.has(item.membershipNumber);
    const selectedCellClass = isSelected ? 'roster-cell--selected' : undefined;

    return (
      <Table.Row
        id={item.id}
        textValue={item.displayName}
        aria-selected={isSelected}
        className='touch-manipulation'
      >
        {enableRowSelection ? (
          <Table.Cell
            className={['w-10', selectedCellClass].filter(Boolean).join(' ')}
            data-selected={isSelected || undefined}
            onPointerDown={stopRowActivation}
            onClick={stopRowActivation}
            onMouseDown={stopRowActivation}
          >
            <RosterCheckbox
              ariaLabel={`Select ${item.displayName}`}
              checked={isSelected}
              onChange={(checked) =>
                toggleMemberSelected(item.membershipNumber, checked)
              }
            />
          </Table.Cell>
        ) : null}
        <Table.Cell
          textValue={item.membershipNumber}
          className={['cursor-pointer', selectedCellClass]
            .filter(Boolean)
            .join(' ')}
          data-selected={isSelected || undefined}
          onClick={() => toggleRowExpanded(item.id)}
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
          textValue={item.displayName}
          className={['cursor-pointer', selectedCellClass]
            .filter(Boolean)
            .join(' ')}
          data-selected={isSelected || undefined}
          onClick={() => toggleRowExpanded(item.id)}
        >
          <span className='truncate'>{item.displayName}</span>
        </Table.Cell>
        <Table.Cell
          textValue={item.memberClassLabel ?? ''}
          className={selectedCellClass}
          data-selected={isSelected || undefined}
        >
          {item.memberClassLabel ?? '—'}
        </Table.Cell>
        <Table.Cell
          textValue={item.primaryEmail ?? ''}
          className={['hidden md:table-cell', selectedCellClass]
            .filter(Boolean)
            .join(' ')}
          data-selected={isSelected || undefined}
        >
          <span className='break-all'>{item.primaryEmail ?? '—'}</span>
        </Table.Cell>
        {showDuesTools ? (
          <Table.Cell
            textValue={formatDuesStatus(duesStatus)}
            className={selectedCellClass}
            data-selected={isSelected || undefined}
          >
            <span
              className={
                duesStatus === 'paid'
                  ? 'font-medium text-emerald-700 dark:text-emerald-400'
                  : duesStatus === 'unpaid'
                    ? 'font-medium text-red-600 dark:text-red-400'
                    : 'text-muted-foreground'
              }
            >
              {formatDuesStatus(duesStatus)}
            </span>
          </Table.Cell>
        ) : null}
        <Table.Cell
          textValue={item.active ? 'Active' : 'Inactive'}
          className={selectedCellClass}
          data-selected={isSelected || undefined}
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
              type='search'
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder='Name, number, email…'
            />
          </TextField>

          <Select
            selectedKey={classFilter}
            onSelectionChange={(key) => {
              if (key != null) {
                setClassFilter(String(key));
              }
            }}
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
                {memberClassCodes.map((code) => (
                  <ListBox.Item
                    key={code}
                    id={code}
                    textValue={memberClassLabels[code]}
                  >
                    {memberClassLabels[code]}
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>

          <Select
            selectedKey={degreeFilter}
            onSelectionChange={(key) => {
              if (key != null) {
                setDegreeFilter(String(key));
              }
            }}
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
            selectedKey={activeFilter}
            onSelectionChange={(key) => {
              if (key != null) {
                setActiveFilter(String(key) as ActiveFilter);
              }
            }}
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

          {showDuesTools ? (
            <Select
              selectedKey={duesFilter}
              onSelectionChange={(key) => {
                if (key != null) {
                  setDuesFilter(String(key) as DuesFilter);
                }
              }}
            >
              <Label>Dues{councilYear ? ` (${councilYear})` : ''}</Label>
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
          ) : null}
        </div>

        {enableRowSelection ? (
          <div className='flex flex-wrap items-center gap-3 border-b border-border px-4 py-2 text-sm'>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onPress={() =>
                setSelectionForMembershipNumbers(
                  filteredMembershipNumbers,
                  !allFilteredSelected,
                )
              }
            >
              {allFilteredSelected
                ? 'Deselect all filtered'
                : 'Select all filtered'}
            </Button>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onPress={() =>
                setSelectionForMembershipNumbers(
                  pageMembershipNumbers,
                  !allPageSelected,
                )
              }
            >
              {allPageSelected ? 'Deselect page' : 'Select page'}
            </Button>
            {selectedMembershipNumbers.size > 0 ? (
              <>
                <span className='text-muted-foreground'>
                  {selectedMembershipNumbers.size} selected
                </span>
                <Button
                  type='button'
                  variant='primary'
                  size='sm'
                  onPress={() => setEmailModalOpen(true)}
                >
                  Email selected
                </Button>
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  onPress={() => setSelectedMembershipNumbers(new Set())}
                >
                  Clear selection
                </Button>
              </>
            ) : null}
          </div>
        ) : null}

        <p className='border-b border-border px-4 py-2 text-sm text-muted-foreground'>
          Showing {sortedMembers.length === 0 ? 0 : pageStart}–{pageEnd} of{' '}
          {sortedMembers.length} filtered ({members.length} total)
        </p>

        <Table className='roster-table'>
          <Table.ScrollContainer>
            <Table.Content
              aria-label='Council roster'
              className='min-w-[640px]'
              expandedKeys={expandedKeys}
              sortDescriptor={sortDescriptor}
              onExpandedChange={setExpandedKeys}
              onSortChange={setSortDescriptor}
            >
              <Table.Header>
                {enableRowSelection ? (
                  <Table.Column className='w-10'>
                    <RosterCheckbox
                      ariaLabel='Select all members on this page'
                      checked={allPageSelected}
                      indeterminate={!allPageSelected && somePageSelected}
                      onChange={(checked) =>
                        setSelectionForMembershipNumbers(
                          pageMembershipNumbers,
                          checked,
                        )
                      }
                    />
                  </Table.Column>
                ) : null}
                <Table.Column allowsSorting id='membershipNumber'>
                  {({ sortDirection }) => (
                    <Table.SortableColumnHeader sortDirection={sortDirection}>
                      Number
                    </Table.SortableColumnHeader>
                  )}
                </Table.Column>
                <Table.Column allowsSorting isRowHeader id='displayName'>
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
                  id='primaryEmail'
                  className='hidden md:table-cell'
                >
                  {({ sortDirection }) => (
                    <Table.SortableColumnHeader sortDirection={sortDirection}>
                      Email
                    </Table.SortableColumnHeader>
                  )}
                </Table.Column>
                {showDuesTools ? (
                  <Table.Column allowsSorting id='duesPaid'>
                    {({ sortDirection }) => (
                      <Table.SortableColumnHeader sortDirection={sortDirection}>
                        Dues
                      </Table.SortableColumnHeader>
                    )}
                  </Table.Column>
                ) : null}
                <Table.Column allowsSorting id='active'>
                  {({ sortDirection }) => (
                    <Table.SortableColumnHeader sortDirection={sortDirection}>
                      Active
                    </Table.SortableColumnHeader>
                  )}
                </Table.Column>
              </Table.Header>
              <Table.Body
                key={[...selectedMembershipNumbers].sort().join(',')}
                items={paginatedRows}
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
          {sortedMembers.length > 0 ? (
            <Table.Footer>
              <Pagination size='sm'>
                <Pagination.Summary>
                  {pageStart}–{pageEnd} of {sortedMembers.length}
                </Pagination.Summary>
                <Pagination.Content>
                  <Pagination.Item>
                    <Pagination.Previous
                      isDisabled={safePage === 1}
                      onPress={() =>
                        setPage((current) => Math.max(1, current - 1))
                      }
                    >
                      <Pagination.PreviousIcon />
                      Prev
                    </Pagination.Previous>
                  </Pagination.Item>
                  {pages.map((pageNumber) => (
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
                        setPage((current) => Math.min(totalPages, current + 1))
                      }
                    >
                      Next
                      <Pagination.NextIcon />
                    </Pagination.Next>
                  </Pagination.Item>
                </Pagination.Content>
              </Pagination>
            </Table.Footer>
          ) : null}
        </Table>
      </section>

      {enableRowSelection ? (
        <RosterEmailModal
          members={selectedMembers}
          isOpen={emailModalOpen}
          onOpenChange={setEmailModalOpen}
        />
      ) : null}
    </div>
  );
};
