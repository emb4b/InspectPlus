import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutChangeEvent } from 'react-native';
import Reanimated, {
  Extrapolation,
  interpolate,
  runOnJS,
  SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../../constants/colors';
import { AppText } from '../../../components/AppText';
import { useAuthContext } from '../../../core/providers/AuthProvider';
import { useInspectorName } from '../../../core/hooks/useInspectorName';
import { canManageAllRecords } from '../../establishments/hooks/useEstablishment';
import { getReportTypeMeta } from '../reportTypeMeta';
import { confirmResolveConflict } from '../../../services/sync/syncConflictResolution';
import { TwoRowTabs, TwoRowMainTabDef } from './TwoRowTabs';
import type { SyncStatus } from '../../establishments/types';

// Non-water report kinds (hazwaste, air, eia) still use this original
// 3-tab structure — only water reports get the full 1-6 section/subsection
// menu built by buildWaterReportTabs. See InspectionReportDetailScreen.
export const DEFAULT_REPORT_DETAIL_TABS: TwoRowMainTabDef[] = [
  { key: 'geninfo', number: '1', label: 'General Information' },
  { key: 'purpose', number: '2', label: 'Purpose of Inspection' },
  { key: 'compliance', number: '3', label: 'Compliance Status' },
  { key: 'attachments', number: '4', label: 'Attachments' },
];

// How far the leading icon shrinks once the header is fully collapsed.
const COLLAPSED_ICON_SCALE = 0.7;

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface InspectionReportHeaderProps {
  reportId: string;
  establishmentName: string;
  establishmentLocation: string;
  reportType: string;
  reportControlNo: string | null;
  inspectionDate: string;
  reportStatus: string;
  // Normalized sync status ('synced' | 'pending' | 'conflict'), already
  // folding in this report's own attachments — see
  // reportSyncStatusWithAttachments and useInspectionReport.ts. The badge
  // is omitted entirely when 'synced' (nothing to flag).
  syncStatus: SyncStatus;
  inspectorUid: string;
  tabs: TwoRowMainTabDef[];
  activeMain: string;
  onMainChange: (key: string) => void;
  onBack: () => void;
  // Only the inspector who owns the report (or a Developer account, which
  // gets unrestricted write access — see canManageAllRecords) can delete
  // it — omitted entirely (rather than passed disabled) otherwise.
  onDelete?: () => void;
  // Scroll-driven collapse progress (0 = expanded, 1 = collapsed), shared
  // with the screen's scroll view — see HeaderScrollContext. Only the
  // establishment card collapses; the tab row below always stays put so
  // the tabs never move around under the user's thumb.
  collapsed?: SharedValue<number>;
}

export const InspectionReportHeader: React.FC<InspectionReportHeaderProps> = ({
  reportId,
  establishmentName,
  establishmentLocation,
  reportType,
  reportControlNo,
  inspectionDate,
  reportStatus,
  syncStatus,
  inspectorUid,
  tabs,
  activeMain,
  onMainChange,
  onBack,
  onDelete,
  collapsed,
}) => {
  const typeMeta = getReportTypeMeta(reportType);
  const IconAsset = typeMeta.iconAsset;
  const isSubmitted = reportStatus === 'submitted';

  // collapsed is HeaderScrollContext's own animated 0..1 value (a single,
  // bounded transition per threshold crossing — see HeaderScrollContext) —
  // this can just read it straight through, same as HomeHeader.
  const progress = useDerivedValue(() => (collapsed ? collapsed.value : 0), [collapsed]);

  // The collapsing blocks below need their own natural (expanded) height as
  // the interpolation's starting bound. A guessed placeholder that's larger
  // than the real content means maxHeight has no visible effect until
  // progress is most of the way to 1 — everything then collapses in one
  // sudden jump instead of shrinking smoothly with the scroll, which reads
  // as a jiggle rather than a collapse. The screen always mounts expanded
  // (see _layout.tsx's expand() on every route change), so the first
  // onLayout pass is guaranteed to report the true, uncapped height —
  // captured once and reused as the animation's real starting bound.
  //
  // null (not a numeric placeholder) means "not measured yet": the very
  // first render already applies whatever this height resolves to as a
  // maxHeight/overflow:hidden constraint, before onLayout has ever fired —
  // so a numeric placeholder shorter than the true content (e.g. a 1-line
  // guess for text that actually wraps to 2) clips the content on that
  // first render, which is exactly what onLayout then measures and locks
  // in forever. Rendering unconstrained until the real measurement lands
  // avoids the constraint corrupting its own calibration.
  const [metaBlockHeight, setMetaBlockHeight] = useState<number | null>(null);
  const metaBlockMeasured = useRef(false);
  const handleMetaBlockLayout = (e: LayoutChangeEvent) => {
    if (metaBlockMeasured.current) return;
    metaBlockMeasured.current = true;
    setMetaBlockHeight(e.nativeEvent.layout.height);
  };

  // Same measure-once pattern as above — the leading icon box grows to
  // match the combined height of the name + address (never the sync row,
  // which is conditional and would make the icon's size jump around), so
  // it reads as a logo spanning the full title block instead of a small
  // fixed square dwarfed by two lines of wrapped text. Locked in from the
  // first (expanded, uncollapsed) layout pass rather than re-measured live,
  // so it doesn't chase the scroll-collapse animation's shrinking height.
  const [titleBlockHeight, setTitleBlockHeight] = useState<number | null>(null);
  const titleBlockMeasured = useRef(false);
  const handleTitleBlockLayout = (e: LayoutChangeEvent) => {
    if (titleBlockMeasured.current) return;
    titleBlockMeasured.current = true;
    setTitleBlockHeight(e.nativeEvent.layout.height);
  };

  const metaAnimatedStyle = useAnimatedStyle(() => {
    if (metaBlockHeight === null) return {};
    return {
      maxHeight: interpolate(progress.value, [0, 1], [metaBlockHeight, 0], Extrapolation.CLAMP),
      opacity: interpolate(progress.value, [0, 0.6, 1], [1, 0, 0], Extrapolation.CLAMP),
    };
  }, [metaBlockHeight]);

  // Same self-vs-other resolution as EstablishmentDetailScreen — fullName is
  // only ever the signed-in user's own name, so it can't be assumed to match
  // this report's assigned inspector.
  const { fullName, session, role } = useAuthContext();
  const currentUid = (session as { user?: { id?: string } } | null)?.user?.id ?? '';
  const isSelf = inspectorUid === currentUid;
  const canManage = isSelf || canManageAllRecords(role ?? '');
  const { name: resolvedInspectorName, loading: inspectorNameLoading } = useInspectorName(
    !isSelf ? inspectorUid : undefined,
  );
  const inspectorLabel = isSelf
    ? fullName || 'You'
    : resolvedInspectorName ?? (inspectorNameLoading ? 'Loading…' : 'Unknown inspector');

  // Square box — width tracks the measured height 1:1 so the icon reads as
  // a logo scaling proportionally rather than a fixed square stretching
  // into a rectangle. Glyph grows with the box at its original ~1:2 ratio
  // (22/44) so it stays visually balanced instead of shrinking into a
  // corner of a much taller box.
  const iconSize = titleBlockHeight ?? 44;
  const iconGlyphSize = Math.round(iconSize * 0.5);

  // Collapsing the icon with a transform alone only repainted it smaller —
  // the box kept its expanded footprint, so the collapsed header carried a
  // block of dead space under the glyph, the title fell out of alignment
  // beside it, and that phantom height propped the whole card open. The
  // box's own width/height animate here so the layout follows the paint,
  // and the glyph scales inside it to stay centred and proportional.
  const iconBoxStyle = useAnimatedStyle(() => {
    const size = interpolate(
      progress.value,
      [0, 1],
      [iconSize, iconSize * COLLAPSED_ICON_SCALE],
      Extrapolation.CLAMP,
    );
    return { width: size, height: size };
  }, [iconSize]);
  const iconGlyphStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(progress.value, [0, 1], [1, COLLAPSED_ICON_SCALE], Extrapolation.CLAMP) },
    ],
  }));

  // The badges swap shape rather than shrink: expanded they're stacked text
  // pills, collapsed they're two icons side by side. flexDirection can't be
  // animated and the label can't be interpolated away, so this crosses a
  // threshold into a different render instead. It's one setState per
  // crossing, not per frame — the reaction only fires when the boolean
  // itself flips.
  const [badgesCollapsed, setBadgesCollapsed] = useState(false);
  useAnimatedReaction(
    () => progress.value > 0.5,
    (isCollapsed, wasCollapsed) => {
      if (isCollapsed !== wasCollapsed) runOnJS(setBadgesCollapsed)(isCollapsed);
    },
  );

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={16} color={Colors.navy} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        {canManage && onDelete && (
          <TouchableOpacity style={styles.deleteBtn} onPress={onDelete} activeOpacity={0.7}>
            <Ionicons name="trash-outline" size={14} color={Colors.conflict} />
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.card}>
        {/* Hidden until the title block's height is measured, so the icon
            appears at its final size instead of visibly popping from the 44
            default to the measured size once layout settles — see
            EstablishmentHeaderCard for the same treatment. */}
        <View style={[styles.topRow, titleBlockHeight === null && styles.topRowMeasuring]}>
          <Reanimated.View style={[styles.iconWrap, iconBoxStyle]}>
            <Reanimated.View style={iconGlyphStyle}>
              <Ionicons name="document-text" size={iconGlyphSize} color={Colors.green} />
            </Reanimated.View>
          </Reanimated.View>
          <View style={styles.titleInfo}>
            <View onLayout={handleTitleBlockLayout}>
              <AppText variant="marquee" text={establishmentName} style={styles.name} />
              {/* The address stays through the collapse. It's the one piece
                  of context that says *which* site this report is for, so
                  losing it on scroll made the collapsed header ambiguous —
                  unlike the meta chips below, which repeat information the
                  form itself carries. */}
              <View style={styles.locationRow}>
                <Ionicons name="location" size={11} color={Colors.green} style={styles.locationIcon} />
                <AppText
                  variant="marquee"
                  text={establishmentLocation}
                  style={styles.location}
                  containerStyle={styles.locationContainer}
                />
              </View>
            </View>
            {/* Spelled out while there's room. Collapsed, this moves into the
                badge group as a chip instead of staying a third line in a
                column that has already shrunk to two — otherwise the
                collapsed header's height would depend on sync state and jump
                the moment a report finished syncing. */}
            {!badgesCollapsed && syncStatus === 'pending' && (
              <View style={styles.syncRow}>
                <Ionicons name="cloud-upload-outline" size={10} color={Colors.pending} />
                <Text style={styles.syncText}>Pending sync</Text>
              </View>
            )}
            {!badgesCollapsed && syncStatus === 'conflict' && (
              <TouchableOpacity
                style={styles.syncRow}
                onPress={() => confirmResolveConflict('inspection_reports', reportId, establishmentName)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Ionicons name="alert-circle-outline" size={10} color={Colors.conflict} />
                <Text style={[styles.syncText, { color: Colors.conflict }]}>Sync conflict</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={[styles.badgeGroup, badgesCollapsed && styles.badgeGroupInline]}>
            {/* The law citation (e.g. "R.A. 9275") stands in for the full report
                type name here. Stacked top-to-bottom rather than side by side —
                a row of both pills was wide enough to squeeze the name/address
                column into truncating; stacked, badgeGroup only needs to be as
                wide as the wider single pill.

                Collapsed, both drop their labels and sit inline as icons: the
                pair then costs one line instead of two, which is what let the
                header actually compact down once the icon box stopped
                reserving its expanded footprint. The labels they lose are
                re-attached as accessibility names, since an icon alone still
                has to announce which law and which status it stands for. */}
            {badgesCollapsed ? (
              <>
                <View
                  style={[styles.badgeIcon, { backgroundColor: typeMeta.bgColor }]}
                  accessibilityLabel={typeMeta.law || typeMeta.label}>
                  {IconAsset && <IconAsset width={14} height={14} />}
                </View>
                <View
                  style={[
                    styles.badgeIcon,
                    { backgroundColor: isSubmitted ? Colors.greenMuted : Colors.warning.badgeBg },
                  ]}
                  accessibilityLabel={isSubmitted ? 'Submitted' : 'Draft'}>
                  <Ionicons
                    name={isSubmitted ? 'checkmark-circle' : 'create-outline'}
                    size={14}
                    color={isSubmitted ? Colors.green : Colors.warning.text}
                  />
                </View>
                {syncStatus === 'pending' && (
                  <View
                    style={[styles.badgeIcon, { backgroundColor: Colors.pendingMuted }]}
                    accessibilityLabel="Pending sync">
                    <Ionicons name="cloud-upload-outline" size={14} color={Colors.pending} />
                  </View>
                )}
                {/* Still the tap target that opens the resolve dialog, so it
                    keeps a button role and a label that says what tapping
                    does — and hitSlop to bring a 28dp chip up to the 48dp
                    Android minimum, same as the shared Button. */}
                {syncStatus === 'conflict' && (
                  <TouchableOpacity
                    style={[styles.badgeIcon, { backgroundColor: Colors.conflictMuted }]}
                    onPress={() => confirmResolveConflict('inspection_reports', reportId, establishmentName)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    activeOpacity={0.75}
                    accessibilityRole="button"
                    accessibilityLabel="Sync conflict, tap to resolve">
                    <Ionicons name="alert-circle-outline" size={14} color={Colors.conflict} />
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <>
                <View style={[styles.pill, { backgroundColor: typeMeta.bgColor }]}>
                  {IconAsset && <IconAsset width={11} height={11} />}
                  <Text style={[styles.pillText, { color: typeMeta.textColor }]} numberOfLines={1}>
                    {typeMeta.law || typeMeta.label}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: isSubmitted ? Colors.greenMuted : Colors.warning.badgeBg },
                  ]}>
                  {/* Same glyph the collapsed chip uses, so the badge reads as
                      the same thing in both states rather than as two
                      unrelated markers. Also means status isn't carried by
                      colour alone. */}
                  <Ionicons
                    name={isSubmitted ? 'checkmark-circle' : 'create-outline'}
                    size={11}
                    color={isSubmitted ? Colors.green : Colors.warning.text}
                  />
                  <Text
                    style={[
                      styles.statusBadgeText,
                      { color: isSubmitted ? Colors.green : Colors.warning.text },
                    ]}>
                    {isSubmitted ? 'Submitted' : 'Draft'}
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        <Reanimated.View style={[styles.metaWrap, metaAnimatedStyle]} onLayout={handleMetaBlockLayout}>
          <View style={styles.divider} />

          <View style={styles.metaRow}>
            <View style={[styles.metaChip, styles.metaChipNarrow]}>
              <Ionicons name="calendar-outline" size={11} color={Colors.textLight} />
              <Text style={styles.metaText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.92}>
                {formatDate(inspectionDate)}
              </Text>
            </View>
            {/* Control numbers routinely run longer than the date/inspector
                chips' content ("Control No. 2026-08-09-000123") — giving this
                one more of the row's width means it doesn't need to shrink
                its text nearly as much to fit, unlike the other two. */}
            <View style={[styles.metaChip, styles.metaChipWide]}>
              <Ionicons name="pricetag-outline" size={11} color={Colors.textLight} />
              <Text style={styles.metaText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.92}>
                {reportControlNo ? `Control No. ${reportControlNo}` : 'No control number yet'}
              </Text>
            </View>
            <View style={[styles.metaChip, styles.metaChipNarrow]}>
              <Ionicons name="person-circle-outline" size={12} color={Colors.textLight} />
              <Text style={styles.metaText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.92}>
                {inspectorLabel}
              </Text>
            </View>
          </View>
        </Reanimated.View>
      </View>

      <View style={styles.tabRow}>
        <TwoRowTabs tabs={tabs} activeMain={activeMain} onMainChange={onMainChange} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderBottomWidth: 2,
    borderBottomColor: Colors.border,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 4,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  backText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.navy,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.conflict,
  },
  card: {
    marginHorizontal: 12,
    marginTop: 4,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: Colors.textPrimary,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  topRow: {
    // flex-start: icon and badge group pin to the top of the row rather
    // than recentering as titleInfo's height changes (collapsing, or
    // syncRow appearing/disappearing) — a fixed anchor point instead of a
    // midline that shifts with content.
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  topRowMeasuring: {
    opacity: 0,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.greenMuted,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  titleInfo: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontSize: 15.5,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  metaWrap: {
    overflow: 'hidden',
  },
  // Report-type flag + status badge, stacked top-to-bottom on the right —
  // see the JSX comment above for why column rather than row.
  badgeGroup: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 6,
    flexShrink: 0,
  },
  badgeGroupInline: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Square-ish chip sized to the same 4dp rhythm as everything else, big
  // enough that the glyph inside stays legible without its label.
  badgeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 20,
  },
  pillText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginTop: 4,
  },
  // Nudges the icon down from the row's true top edge to align with the
  // text's cap-height instead of its full line-height box — needed now
  // that locationRow no longer vertically centers the icon against
  // (potentially 2-line) wrapped address text.
  locationIcon: {
    marginTop: 2,
  },
  location: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  locationContainer: {
    flex: 1,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
  },
  syncText: {
    fontSize: 10,
    color: Colors.pending,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    flexShrink: 0,
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 6,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.bgMuted,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  metaChipNarrow: {
    flex: 0.85,
  },
  metaChipWide: {
    flex: 1.3,
  },
  metaText: {
    flex: 1,
    flexShrink: 1,
    fontSize: 11.5,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  tabRow: {
    marginTop: 8,
    paddingBottom: 8,
  },
});
