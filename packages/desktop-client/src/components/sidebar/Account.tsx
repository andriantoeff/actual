// @ts-strict-ignore
import React, { type CSSProperties, useRef, useState } from 'react';

import { AlignedText } from '@actual-app/components/aligned-text';
import { InitialFocus } from '@actual-app/components/initial-focus';
import { Input } from '@actual-app/components/input';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import { css, cx } from '@emotion/css';

import * as Platform from 'loot-core/shared/platform';
import { type AccountEntity } from 'loot-core/types/models';

import { BalanceHistoryGraph } from './BalanceHistoryGraph';

import { Link } from '@desktop-client/components/common/Link';
import { Notes } from '@desktop-client/components/Notes';
import {
  DropHighlight,
  useDraggable,
  useDroppable,
  type OnDragChangeCallback,
  type OnDropCallback,
} from '@desktop-client/components/sort';
import { CellValue } from '@desktop-client/components/spreadsheet/CellValue';
import { useContextMenu } from '@desktop-client/hooks/useContextMenu';
import { useDragRef } from '@desktop-client/hooks/useDragRef';
import { useNotes } from '@desktop-client/hooks/useNotes';
import { openAccountCloseModal } from '@desktop-client/modals/modalsSlice';
import {
  reopenAccount,
  updateAccount,
} from '@desktop-client/queries/queriesSlice';
import { useDispatch } from '@desktop-client/redux';
import { type SheetFields, type Binding } from '@desktop-client/spreadsheet';

export const accountNameStyle: CSSProperties = {
  marginTop: -2,
  marginBottom: 2,
  paddingTop: 4,
  paddingBottom: 4,
  paddingRight: 15,
  paddingLeft: 10,
  textDecoration: 'none',
  color: theme.sidebarItemText,
  ':hover': { backgroundColor: theme.sidebarItemBackgroundHover },
  ...styles.smallText,
};

type AccountProps<FieldName extends SheetFields<'account'>> = {
  name: string;
  to: string;
  query: Binding<'account', FieldName>;
  account?: AccountEntity;
  connected?: boolean;
  pending?: boolean;
  failed?: boolean;
  updated?: boolean;
  style?: CSSProperties;
  outerStyle?: CSSProperties;
  onDragChange?: OnDragChangeCallback<{ id: string }>;
  onDrop?: OnDropCallback;
  titleAccount?: boolean;
};

export function Account<FieldName extends SheetFields<'account'>>({
  name,
  account,
  connected,
  pending = false,
  failed,
  updated,
  to,
  query,
  style,
  outerStyle,
  onDragChange,
  onDrop,
  titleAccount,
}: AccountProps<FieldName>) {
  const type = account
    ? account.closed
      ? 'account-closed'
      : account.offbudget
        ? 'account-offbudget'
        : 'account-onbudget'
    : 'title';

  const triggerRef = useRef(null);
  const { setMenuOpen, menuOpen, handleContextMenu, position } =
    useContextMenu();

  const { dragRef } = useDraggable({
    type,
    onDragChange,
    item: { id: account && account.id },
    canDrag: account != null,
  });
  const handleDragRef = useDragRef(dragRef);

  const { dropRef, dropPos } = useDroppable({
    types: account ? [type] : [],
    id: account && account.id,
    onDrop,
  });

  const dispatch = useDispatch();

  const [isEditing, setIsEditing] = useState(false);

  const accountNote = useNotes(`account-${account?.id}`);
  const isTouchDevice =
    window.matchMedia('(hover: none)').matches ||
    window.matchMedia('(pointer: coarse)').matches;
  const needsTooltip = !!account?.id && !isTouchDevice;

  const accountRow = (
    <View
      innerRef={dropRef}
      style={{ flexShrink: 0, ...outerStyle }}
      onContextMenu={needsTooltip ? handleContextMenu : undefined}
    >
      <View innerRef={triggerRef}>
        <DropHighlight pos={dropPos} />
        <View innerRef={handleDragRef}>
          <Link
            variant="internal"
            to={to}
            isDisabled={isEditing}
            style={{
              ...accountNameStyle,
              ...style,
              position: 'relative',
              borderLeft: '4px solid transparent',
              ...(updated && { fontWeight: 700 }),
            }}
            activeStyle={{
              borderColor: theme.sidebarItemAccentSelected,
              color: theme.sidebarItemTextSelected,
              // This is kind of a hack, but we don't ever want the account
              // that the user is looking at to be "bolded" which means it
              // has unread transactions. The system does mark is read and
              // unbolds it, but it still "flashes" bold so this just
              // ignores it if it's active
              fontWeight: (style && style.fontWeight) || 'normal',
              '& .dot': {
                backgroundColor: theme.sidebarItemAccentSelected,
                transform: 'translateX(-4.5px)',
              },
            }}
          >
            <View
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <div
                className={cx(
                  'dot',
                  css({
                    marginRight: 3,
                    width: 5,
                    height: 5,
                    borderRadius: 5,
                    backgroundColor: pending
                      ? theme.sidebarItemBackgroundPending
                      : failed
                        ? theme.sidebarItemBackgroundFailed
                        : theme.sidebarItemBackgroundPositive,
                    marginLeft: 2,
                    transition: 'transform .3s',
                    opacity: connected ? 1 : 0,
                  }),
                )}
              />
            </View>

            <AlignedText
              style={
                titleAccount && {
                  borderBottom: `1.5px solid rgba(255,255,255,0.4)`,
                  paddingBottom: '3px',
                }
              }
              left={
                isEditing ? (
                  <InitialFocus>
                    <Input
                      style={{
                        padding: 0,
                        width: '100%',
                      }}
                      onBlur={() => setIsEditing(false)}
                      onEnter={newAccountName => {
                        if (newAccountName.trim() !== '') {
                          dispatch(
                            updateAccount({
                              account: {
                                ...account,
                                name: newAccountName,
                              },
                            }),
                          );
                        }
                        setIsEditing(false);
                      }}
                      onEscape={() => setIsEditing(false)}
                      defaultValue={name}
                    />
                  </InitialFocus>
                ) : (
                  name
                )
              }
              right={<CellValue binding={query} type="financial" />}
            />
          </Link>
          {account && (
            <Popover
              triggerRef={triggerRef}
              placement="bottom start"
              isOpen={menuOpen}
              onOpenChange={() => setMenuOpen(false)}
              style={{ width: 200, margin: 1 }}
              isNonModal
              {...position}
            >
              <Menu
                onMenuSelect={type => {
                  switch (type) {
                    case 'close': {
                      dispatch(
                        openAccountCloseModal({ accountId: account.id }),
                      );
                      break;
                    }
                    case 'reopen': {
                      dispatch(reopenAccount({ id: account.id }));
                      break;
                    }
                    case 'rename': {
                      setIsEditing(true);
                      break;
                    }
                  }
                  setMenuOpen(false);
                }}
                items={[
                  { name: 'rename', text: 'Rename' },
                  account.closed
                    ? { name: 'reopen', text: 'Reopen' }
                    : { name: 'close', text: 'Close' },
                ]}
              />
            </Popover>
          )}
        </View>
      </View>
    </View>
  );

  if (!needsTooltip || Platform.isPlaywright) {
    return accountRow;
  }

  return (
    <Tooltip
      content={
        <View
          style={{
            padding: 10,
          }}
        >
          <Text
            style={{
              fontWeight: 'bold',
            }}
          >
            {name}
          </Text>
          {account && <BalanceHistoryGraph accountId={account.id} />}
          {accountNote && (
            <Notes
              getStyle={() => ({
                borderTop: `1px solid ${theme.tableBorder}`,
                padding: 0,
                paddingTop: '0.5rem',
                marginTop: '0.5rem',
              })}
              notes={accountNote}
            />
          )}
        </View>
      }
      style={{ ...styles.tooltip, borderRadius: '0px 5px 5px 0px' }}
      placement="right top"
      triggerProps={{
        delay: 1000,
        isDisabled: menuOpen,
      }}
    >
      {accountRow}
    </Tooltip>
  );
}
