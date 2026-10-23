# ============================================================
#  PORTER ESTATE - MAIN FLOOR PLAN DRAFTER
#  Generated from Huber & Huber sheet A2.2P (Schematic Design)
#  ------------------------------------------------------------
#  WHAT IT DOES (modifies the model!):
#    1. Draws exterior + interior walls of the main house
#    2. Adds room separation lines for the open-plan areas
#    3. Places and names all rooms (Bedrooms 1-4, Kitchen, Nook,
#       Great Room, Dining, Entry, Gallery, Master Suite, Mudroom...)
#    4. Places single doors at the main openings
#  Run it in an EMPTY floor plan view (Level 1) of a new project.
#  All coordinates are in FEET (Revit internal units).
# ============================================================
import clr
clr.AddReference('RevitServices')
from RevitServices.Persistence import DocumentManager
from RevitServices.Transactions import TransactionManager

clr.AddReference('RevitAPI')
from Autodesk.Revit.DB import *
from Autodesk.Revit.DB.Structure import StructuralType

doc   = DocumentManager.Instance.CurrentDBDocument
uidoc = DocumentManager.Instance.CurrentUIApplication.ActiveUIDocument

WALL_HEIGHT = 10.0   # feet - change if your plate height differs

# ---- WALL CENTERLINES (x1, y1, x2, y2) in feet --------------
# Origin = SW corner of the bedroom wing. +X = east, +Y = north.
EXT_WALLS = [
    (0.0,14.0,   0.0,90.0),    # west wall, bedroom wing
    (0.0,90.0,  23.0,90.0),    # Bedroom 1 north wall
    (23.0,90.0, 23.0,60.25),   # wing east wall (pool side)
    (23.0,60.25,30.0,60.25),   # laundry/pantry north wall
    (30.0,60.25,30.0,70.0),    # nook west wall
    (30.0,70.0, 47.17,70.0),   # nook north wall (pool side)
    (47.17,70.0,47.17,67.0),   # nook east jog
    (47.17,67.0,85.25,67.0),   # great room / dining north wall
    (85.25,67.0,85.25,79.5),   # master bedroom west wall
    (85.25,79.5,110.0,79.5),   # master bedroom north wall
    (110.0,79.5,110.0,26.0),   # east wall, master wing
    (110.0,26.0,85.25,26.0),   # mudroom south wall
    (85.25,26.0,85.25,35.0),   # mudroom west wall
    (85.25,35.0,67.17,35.0),   # gallery south wall (east of entry)
    (67.17,35.0,67.17,26.33),  # entry east wall
    (67.17,26.33,50.0,26.33),  # entry south wall (front door)
    (50.0,26.33,50.0,35.0),    # entry west wall
    (50.0,35.0, 18.0,35.0),    # gallery south wall (west of entry)
    (18.0,35.0, 18.0,14.0),    # bedroom 4 east wall
    (18.0,14.0,  0.0,14.0),    # south wall, bedroom wing
]
INT_WALLS = [
    (0.0,75.0,  23.0,75.0),    # Bedroom 1 south wall
    (18.0,35.0, 18.0,75.0),    # hall west wall
    (0.0,68.0,  18.0,68.0),    # bath band south (BR2 north)
    (0.0,54.5,  18.0,54.5),    # BR2 / BR3 partition
    (0.0,41.0,  18.0,41.0),    # BR3 south wall
    (0.0,35.0,  18.0,35.0),    # BR4 north wall
    (0.0,20.5,  18.0,20.5),    # BR4 south wall
    (23.0,35.0, 23.0,60.25),   # gallery west wall
    (23.0,41.0, 85.25,41.0),   # gallery north wall (long spine)
    (30.0,41.0, 30.0,60.25),   # pantry/laundry east wall
    (23.0,50.0, 30.0,50.0),    # pantry / laundry partition
    (47.17,41.0,47.17,67.0),   # kitchen-nook / great room wall
    (85.25,35.0,85.25,67.0),   # dining east wall
    (85.25,41.0,110.0,41.0),   # mudroom north wall
    (85.25,60.0,110.0,60.0),   # master bedroom south wall
    (97.0,41.0, 97.0,60.0),    # wardrobe / master bath partition
    (85.25,48.0,97.0,48.0),    # hall / wardrobe partition
]
# Open-plan splits drawn as room separation lines, not walls
SEP_LINES = [
    (30.0,60.25,47.17,60.25),  # kitchen | nook
    (67.5,41.0, 67.5,67.0),    # great room | dining
    (50.0,35.0, 67.17,35.0),   # gallery | entry
]
# ---- ROOMS (x, y, name) -------------------------------------
ROOMS = [
    (11.0,82.0,'BEDROOM 1'),   (9.0,71.5,'BATH / CLOSETS'),
    (9.0,61.0,'BEDROOM 2'),    (9.0,47.5,'BEDROOM 3'),
    (9.0,38.0,'BATH'),         (9.0,27.5,'BEDROOM 4'),
    (9.0,17.0,'BATH / CLOSET'),(20.5,55.0,'HALL'),
    (26.5,45.5,'PANTRY'),      (26.5,55.0,'LAUNDRY'),
    (38.5,50.0,'KITCHEN'),     (38.5,65.0,'NOOK'),
    (57.0,54.0,'GREAT ROOM'),  (76.0,54.0,'DINING ROOM'),
    (58.5,30.5,'ENTRY'),       (54.0,38.0,'GALLERY'),
    (91.0,44.5,'HALL'),        (91.0,54.0,'WARDROBE'),
    (103.5,50.0,'MASTER BATH'),(97.5,70.0,'MASTER BEDROOM'),
    (97.5,33.5,'MUDROOM'),
]
# ---- DOORS (x, y) - placed on the nearest wall --------------
DOORS = [
    (20.5,75.0),  # Bedroom 1
    (18.0,61.0),  # Bedroom 2
    (18.0,47.5),  # Bedroom 3
    (12.0,35.0),  # Bedroom 4
    (26.5,41.0),  # Laundry
    (38.5,41.0),  # Kitchen
    (57.0,41.0),  # Great Room
    (76.0,41.0),  # Dining
    (58.5,26.33), # Entry front door
    (88.0,41.0),  # East hall / mudroom
    (97.0,44.5),  # Master bath
    (91.0,60.0),  # Master bedroom
]

log = []
TransactionManager.Instance.EnsureInTransaction(doc)
try:
    # --- find the level (active plan view's level, else lowest) ---
    av = doc.ActiveView
    level = getattr(av, 'GenLevel', None)
    if level is None:
        lvls = list(FilteredElementCollector(doc).OfClass(Level).ToElements())
        lvls.sort(key=lambda l: l.Elevation)
        level = lvls[0]
    z = level.Elevation
    log.append('Level: ' + Element.Name.GetValue(level))

    # --- pick wall types (prefers names containing Exterior/Interior) ---
    basic = [wt for wt in FilteredElementCollector(doc).OfClass(WallType)
             if wt.Kind == WallKind.Basic]
    def find_type(key):
        for wt in basic:
            if key in Element.Name.GetValue(wt).lower():
                return wt
        return None
    ext_type = find_type('exterior') or (basic[0] if basic else None)
    int_type = find_type('interior') or ext_type
    if ext_type is None:
        raise Exception('No basic wall types found in this project.')
    log.append('Exterior wall type: ' + Element.Name.GetValue(ext_type))
    log.append('Interior wall type: ' + Element.Name.GetValue(int_type))

    # --- create walls ---
    walls = []
    def make_walls(segs, wtype):
        n = 0
        for s in segs:
            ln = Line.CreateBound(XYZ(s[0], s[1], z), XYZ(s[2], s[3], z))
            w = Wall.Create(doc, ln, wtype.Id, level.Id,
                            WALL_HEIGHT, 0.0, False, False)
            walls.append(w)
            n += 1
        return n
    log.append('Exterior walls created: %d' % make_walls(EXT_WALLS, ext_type))
    log.append('Interior walls created: %d' % make_walls(INT_WALLS, int_type))

    # --- room separation lines (needs an active plan view) ---
    try:
        ca = CurveArray()
        for s in SEP_LINES:
            ca.Append(Line.CreateBound(XYZ(s[0], s[1], z), XYZ(s[2], s[3], z)))
        plane = Plane.CreateByNormalAndOrigin(XYZ.BasisZ, XYZ(0, 0, z))
        sp = SketchPlane.Create(doc, plane)
        doc.Create.NewRoomBoundaryLines(sp, ca, av)
        log.append('Room separation lines created: %d' % len(SEP_LINES))
    except Exception as se:
        log.append('WARNING - separation lines skipped '
                   '(run from a floor plan view): ' + str(se))

    doc.Regenerate()

    # --- place + name rooms ---
    placed = 0
    for r in ROOMS:
        try:
            room = doc.Create.NewRoom(level, UV(r[0], r[1]))
            room.Name = r[2]
            placed += 1
        except Exception as re:
            log.append('WARNING - room "%s" skipped: %s' % (r[2], str(re)))
    log.append('Rooms placed: %d / %d' % (placed, len(ROOMS)))

    # --- place doors on nearest wall ---
    dsym = None
    for dt in FilteredElementCollector(doc)\
            .OfCategory(BuiltInCategory.OST_Doors)\
            .WhereElementIsElementType():
        dsym = dt
        break
    if dsym is None:
        log.append('WARNING - no door family loaded, doors skipped.')
    else:
        if not dsym.IsActive:
            dsym.Activate()
            doc.Regenerate()
        ok = 0
        for dp in DOORS:
            try:
                pt = XYZ(dp[0], dp[1], z)
                best, bd = None, 1.0e9
                for w in walls:
                    crv = w.Location.Curve
                    d = crv.Distance(pt)
                    if d < bd:
                        bd, best = d, w
                host_pt = best.Location.Curve.Project(pt).XYZPoint
                doc.Create.NewFamilyInstance(host_pt, dsym, best, level,
                                             StructuralType.NonStructural)
                ok += 1
            except Exception as de:
                log.append('WARNING - door at (%s, %s) skipped: %s'
                           % (dp[0], dp[1], str(de)))
        log.append('Doors placed: %d / %d' % (ok, len(DOORS)))

    TransactionManager.Instance.TransactionTaskDone()
    log.append('DONE - Porter Estate main floor drafted.')
    OUT = log
except Exception as e:
    import traceback
    TransactionManager.Instance.ForceCloseTransaction()
    OUT = 'ERROR: ' + str(e) + '\n' + traceback.format_exc() + '\n' + '\n'.join(log)
