"""01-L1-0176 — independently modeled leather cantilever conference chair.

Import-safe bpy / standard-library source. Front is -Y; dimensions are metres.
The upholstered shell and the bent, hollow steel frame are authored surfaces.
"""
import argparse
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Quaternion, Vector


ASSET_ID = "01-L1-0176"
ROOT_NAME = "01-L1-0176_CantileverChair"
PARAMS = {
    "seat_width": (0.53, 0.47, 0.59, "Width of the upholstered seat, metres"),
    "seat_depth": (0.51, 0.46, 0.57, "Seat depth including the rear return, metres"),
    "seat_height": (0.415, 0.385, 0.47, "Nominal upper seat surface above floor, metres"),
    "back_height": (0.334, 0.30, 0.40, "Back height above the seat, metres"),
    "back_recline": (8.0, 5.0, 13.0, "Rearward back angle, degrees from vertical"),
    "tube_diameter": (0.021, 0.018, 0.025, "Outer diameter of the continuous steel tube, metres"),
    "channel_depth": (0.00035, 0.00018, 0.0008, "Depth of the sewn leather channels, metres"),
    "channel_count": (15, 11, 19, "Number of narrow padded channels in the inset panel"),
}


def _mesh(name, verts, faces, mat, root, smooth=True):
    data = bpy.data.meshes.new(name + "_mesh")
    data.from_pydata(verts, [], faces)
    data.update()
    data["asset_owner"] = ASSET_ID
    ob = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(ob)
    ob.parent = root
    if mat is not None:
        data.materials.append(mat)
        ob["material_slot_keys"] = mat.name.split(".")[0]
    if smooth:
        for face in data.polygons:
            face.use_smooth = True
    return ob


def _material(slot, color, roughness, metallic=0.0):
    key = "slot:" + slot
    mat = next((m for m in bpy.data.materials
                if m.get("asset_owner") == ASSET_ID and m.get("slot_key") == key), None)
    if mat is None:
        mat = bpy.data.materials.new(key)
    mat["asset_owner"] = ASSET_ID
    mat["slot_key"] = key
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    out.location = (660, 120)
    shader = nodes.new("ShaderNodeBsdfPrincipled")
    shader.location = (370, 120)
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Roughness"].default_value = roughness
    shader.inputs["Metallic"].default_value = metallic
    mat.node_tree.links.new(shader.outputs["BSDF"], out.inputs["Surface"])
    return mat, shader


def _materials():
    leather, bsdf = _material("leather", (0.18, 0.062, 0.028), 0.49)
    bsdf.inputs["Coat Weight"].default_value = 0.025
    bsdf.inputs["Coat Roughness"].default_value = 0.46
    bsdf.inputs["Specular IOR Level"].default_value = 0.25
    nodes, links = leather.node_tree.nodes, leather.node_tree.links
    coord = nodes.new("ShaderNodeTexCoord")
    coord.location = (-920, 140)
    broad = nodes.new("ShaderNodeTexNoise")
    broad.name = "Subtle aniline dye variation"
    broad.location = (-700, 300)
    broad.inputs["Scale"].default_value = 5.3
    broad.inputs["Detail"].default_value = 3.2
    broad.inputs["Roughness"].default_value = 0.72
    links.new(coord.outputs["Object"], broad.inputs["Vector"])
    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.location = (-410, 320)
    ramp.color_ramp.elements[0].position = 0.16
    ramp.color_ramp.elements[0].color = (0.123, 0.039, 0.018, 1)
    ramp.color_ramp.elements[1].position = 0.85
    ramp.color_ramp.elements[1].color = (0.210, 0.086, 0.046, 1)
    links.new(broad.outputs["Fac"], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], bsdf.inputs["Base Color"])
    grain = nodes.new("ShaderNodeTexNoise")
    grain.name = "Fine leather grain, physical scale"
    grain.location = (-680, -30)
    grain.inputs["Scale"].default_value = 240
    grain.inputs["Detail"].default_value = 3.0
    grain.inputs["Roughness"].default_value = 0.78
    links.new(coord.outputs["Object"], grain.inputs["Vector"])
    pores = nodes.new("ShaderNodeTexVoronoi")
    pores.name = "Small irregular hide pores"
    pores.location = (-680, -280)
    pores.feature = "DISTANCE_TO_EDGE"
    pores.inputs["Scale"].default_value = 640
    links.new(coord.outputs["Object"], pores.inputs["Vector"])
    mix = nodes.new("ShaderNodeMixRGB")
    mix.blend_type = "MULTIPLY"
    mix.inputs[0].default_value = 0.27
    mix.location = (-370, -80)
    links.new(grain.outputs["Fac"], mix.inputs[1])
    links.new(pores.outputs["Distance"], mix.inputs[2])
    bump = nodes.new("ShaderNodeBump")
    bump.location = (110, -70)
    bump.inputs["Strength"].default_value = 0.23
    bump.inputs["Distance"].default_value = 0.0013
    links.new(mix.outputs["Color"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    rough = nodes.new("ShaderNodeMapRange")
    rough.location = (-150, 145)
    rough.inputs["To Min"].default_value = 0.44
    rough.inputs["To Max"].default_value = 0.55
    links.new(grain.outputs["Fac"], rough.inputs["Value"])
    links.new(rough.outputs["Result"], bsdf.inputs["Roughness"])

    metal, bsdf = _material("metal", (0.071, 0.077, 0.077), 0.33, 0.86)
    bsdf.inputs["Coat Weight"].default_value = 0.10
    n = metal.node_tree.nodes.new("ShaderNodeTexNoise")
    n.inputs["Scale"].default_value = 195
    n.inputs["Detail"].default_value = 2
    n.location = (-340, 80)
    r = metal.node_tree.nodes.new("ShaderNodeMapRange")
    r.location = (-90, 80)
    r.inputs["To Min"].default_value = 0.31
    r.inputs["To Max"].default_value = 0.37
    metal.node_tree.links.new(n.outputs["Fac"], r.inputs["Value"])
    metal.node_tree.links.new(r.outputs["Result"], bsdf.inputs["Roughness"])
    trim, _ = _material("trim", (0.075, 0.026, 0.011), 0.53)
    rubber, _ = _material("rubber", (0.012, 0.014, 0.014), 0.69)
    return {"leather": leather, "metal": metal, "trim": trim, "rubber": rubber}


def apply_material(root, slot, mat):
    """Replace a semantic slot, including a previously replaced material."""
    key = slot if slot.startswith("slot:") else "slot:" + slot
    for ob in root.children_recursive:
        if not hasattr(ob.data, "materials"):
            continue
        keys = ob.get("material_slot_keys", "").split("|")
        for index, old in enumerate(ob.data.materials):
            if (index < len(keys) and keys[index] == key) or (old and old.name.split(".")[0] == key):
                ob.data.materials[index] = mat


def _sweep(name, points, radius, mat, root, sides=16, closed=False, wall=0):
    """Parallel-transport tube, with genuine annular end walls when hollow."""
    pts = [Vector(p) for p in points]
    count = len(pts)
    tangents = []
    for i in range(count):
        prev = pts[(i - 1) % count] if closed or i > 0 else pts[0]
        nex = pts[(i + 1) % count] if closed or i < count - 1 else pts[-1]
        tangents.append((nex - prev).normalized())
    normal = Vector((1, 0, 0))
    if abs(normal.dot(tangents[0])) > 0.9:
        normal = Vector((0, 0, 1))
    normal = (normal - tangents[0] * normal.dot(tangents[0])).normalized()
    frames = []
    for i, tangent in enumerate(tangents):
        if i:
            normal = tangents[i - 1].rotation_difference(tangent) @ normal
            normal = (normal - tangent * normal.dot(tangent)).normalized()
        frames.append((normal.copy(), tangent.cross(normal).normalized()))
    radii = [radius, radius - wall] if wall else [radius]
    verts, faces = [], []
    for rad in radii:
        for pt, (u, v) in zip(pts, frames):
            for j in range(sides):
                angle = j * 2 * math.pi / sides
                verts.append(tuple(pt + rad * (u * math.cos(angle) + v * math.sin(angle))))
    segment_count = count if closed else count - 1
    for layer in range(len(radii)):
        offset = layer * count * sides
        for i in range(segment_count):
            for j in range(sides):
                a = offset + i * sides + j
                b = offset + i * sides + (j + 1) % sides
                c = offset + ((i + 1) % count) * sides + (j + 1) % sides
                d = offset + ((i + 1) % count) * sides + j
                faces.append((a, b, c, d) if layer == 0 else (d, c, b, a))
    if not closed:
        if wall:
            layer = count * sides
            for index, reverse in [(0, True), (count - 1, False)]:
                for j in range(sides):
                    a, b = index * sides + j, index * sides + (j + 1) % sides
                    quad = (a, b, layer + b, layer + a)
                    faces.append(tuple(reversed(quad)) if reverse else quad)
        else:
            faces.append(tuple(reversed(range(sides))))
            faces.append(tuple((count - 1) * sides + j for j in range(sides)))
    return _mesh(name, verts, faces, mat, root)


def _filleted_path(points, radii):
    points = [Vector(p) for p in points]
    out = [points[0]]
    for i in range(1, len(points) - 1):
        a, b, c = points[i - 1:i + 2]
        incoming, outgoing = (b - a).normalized(), (c - b).normalized()
        angle = math.acos(max(-1.0, min(1.0, incoming.dot(outgoing))))
        if angle < 0.0001:
            out.append(b)
            continue
        cut = min(radii[i - 1] * math.tan(angle / 2), (b - a).length * 0.42, (c - b).length * 0.42)
        radius = cut / math.tan(angle / 2)
        start = b - incoming * cut
        inward = (outgoing - incoming * incoming.dot(outgoing)).normalized()
        center = start + inward * radius
        axis = incoming.cross(outgoing).normalized()
        radial = start - center
        steps = max(5, int(math.ceil(angle / math.radians(7.5))))
        for j in range(steps + 1):
            out.append(center + Quaternion(axis, angle * j / steps) @ radial)
    out.append(points[-1])
    return out


def _rounded_block(name, center, dims, radius, mat, root):
    x, y, z = (d / 2 for d in dims)
    verts = [(sx * x + center[0], sy * y + center[1], sz * z + center[2])
             for sx, sy, sz in [(-1,-1,-1), (1,-1,-1), (1,1,-1), (-1,1,-1),
                               (-1,-1,1), (1,-1,1), (1,1,1), (-1,1,1)]]
    faces = [(0,3,2,1), (4,5,6,7), (0,1,5,4), (1,2,6,5), (2,3,7,6), (3,0,4,7)]
    ob = _mesh(name, verts, faces, mat, root)
    bevel = ob.modifiers.new("Small manufactured edge radii", "BEVEL")
    bevel.width = radius
    bevel.segments = 3
    bevel.affect = "EDGES"
    normal = ob.modifiers.new("Weighted planar normals", "WEIGHTED_NORMAL")
    normal.keep_sharp = True
    return ob


class Upholstery:
    def __init__(self, p):
        self.p = p
        self.width = p["seat_width"]
        self.front_y = -p["seat_depth"] * 0.585
        self.seat_run = p["seat_depth"] - 0.055
        self.start_z = p["seat_height"] - 0.024
        self.slope = 0.012
        self.theta0 = math.atan(self.slope)
        self.theta1 = math.radians(90 - p["back_recline"])
        self.radius = 0.054
        self.arc_length = self.radius * (self.theta1 - self.theta0)
        self.arc_end = self.seat_run + self.arc_length
        self.y0 = self.front_y + self.seat_run * math.cos(self.theta0)
        self.z0 = self.start_z + self.seat_run * math.sin(self.theta0)
        self.y1 = self.y0 + self.radius * (math.sin(self.theta1) - math.sin(self.theta0))
        self.z1 = self.z0 + self.radius * (math.cos(self.theta0) - math.cos(self.theta1))
        self.top_z = p["seat_height"] + p["back_height"] - 0.006
        self.length = self.arc_end + (self.top_z - self.z1) / math.sin(self.theta1)
        self.nchannels = int(round(p["channel_count"]))
        self.seams = [-0.88 + 1.76 * i / self.nchannels for i in range(self.nchannels + 1)]

    def spine(self, s):
        if s <= self.seat_run:
            angle = self.theta0
            y = self.front_y + s * math.cos(angle)
            z = self.start_z + s * math.sin(angle)
        elif s <= self.arc_end:
            angle = self.theta0 + (s - self.seat_run) / self.radius
            y = self.y0 + self.radius * (math.sin(angle) - math.sin(self.theta0))
            z = self.z0 + self.radius * (math.cos(self.theta0) - math.cos(angle))
        else:
            angle = self.theta1
            y = self.y1 + (s - self.arc_end) * math.cos(angle)
            z = self.z1 + (s - self.arc_end) * math.sin(angle)
        return Vector((0, y, z)), Vector((0, -math.sin(angle), math.cos(angle))), Vector((0, math.cos(angle), math.sin(angle)))

    def halfwidth(self, s):
        t = min(1.0, max(0.0, s / self.arc_end))
        half = self.width * (0.5 - 0.044 * t)
        edge_dist = min(s, self.length - s)
        corner = 0.027
        if edge_dist < corner:
            half -= corner - math.sqrt(max(0.0, corner * corner - (corner - edge_dist) ** 2))
        return half

    def panel_limits(self, u):
        seat_edge = 0.115 + 0.026 * (0.5 + 0.5 * math.cos(math.pi * u / 0.88))
        # A prominent high central arch with low shoulders, as in the reference.
        back_z = self.p["seat_height"] + self.p["back_height"] * (0.64 + 0.060 * math.cos(math.pi * u / 0.88))
        back_edge = self.arc_end + (back_z - self.z1) / math.sin(self.theta1)
        return seat_edge, back_edge

    def row_s(self, u):
        low, high = self.panel_limits(u)
        epsilon = 0.0021
        rows = [(low - epsilon) * j / 15 for j in range(16)]
        rows += [low, low + epsilon]
        rows += [low + epsilon + (high - low - 2 * epsilon) * j / 64 for j in range(1, 65)]
        rows += [high, high + epsilon]
        rows += [high + epsilon + (self.length - high - epsilon) * (1 - math.cos(math.pi * j / 21)) / 2 for j in range(1, 22)]
        return rows

    def point(self, u, s, back=False, extra=0):
        center, normal, tangent = self.spine(s)
        half = self.halfwidth(s)
        x = u * half
        dist = min((1 - abs(u)) * half, s, self.length - s)
        edge = 1 - math.exp(-max(0, dist) / 0.012)
        upright = min(1.0, max(0.0, (s - self.seat_run) / self.arc_length))
        # Mild transverse wrapping of the back, with a padded lumbar return.
        center += normal * (0.006 * u * u * upright)
        if back:
            offset = -0.017 - 0.0018 * edge - 0.010 * math.exp(-(s / 0.10) ** 2)
        else:
            offset = 0.002 + 0.022 * edge
            offset += 0.0080 * math.exp(-((s - self.length + 0.065) / 0.07) ** 2) * (1 - u*u) * edge
            offset += 0.010 * math.exp(-((s - 0.055) / 0.060) ** 2) * (1 - 0.35*u*u) * edge
            offset -= 0.0045 * math.exp(-((s - 0.255) / 0.115) ** 2) * (1 - u*u) ** 2 * edge
            offset += 0.0022 * math.exp(-((s - self.arc_end) / 0.075) ** 2) * (1 - u*u) * edge
            low, high = self.panel_limits(u)
            inside = min(1.0, max(0.0, (s - low) / 0.009), max(0.0, (high - s) / 0.009))
            if abs(u) <= 0.897:
                nearest = min(abs(u - seam) for seam in self.seams) * half
                offset -= self.p["channel_depth"] * math.exp(-(nearest / 0.00090) ** 2) * inside
                offset += 0.00007 * (1 - math.exp(-(nearest / 0.006) ** 2)) * inside
                seam_fade = min(1.0, max(0.0, (0.9 - abs(u)) / 0.025))
                offset -= 0.00045 * math.exp(-((s - high) / 0.0016) ** 2) * seam_fade
                offset -= 0.00035 * math.exp(-((s - low) / 0.0015) ** 2) * seam_fade
            # Sub-millimetre leather slack; deliberately subdued rather than tufted.
            offset += 0.00025 * math.sin(53 * s + 2 * u) * math.sin(17 * u + 9 * s) * edge
            offset += 0.00032 * math.sin(180 * s + 28 * u) * math.exp(-((abs(u) - 0.78) / 0.12) ** 2) * math.exp(-((s - 0.12) / 0.10) ** 2) * edge
        return center + Vector((x, 0, 0)) + normal * (offset + extra)

    def create(self, root, mats):
        us = {-1.0, -0.99, -0.97, -0.94, 0.94, 0.97, 0.99, 1.0}
        for seam in self.seams:
            us.update([seam - 0.010, seam - 0.0045, seam, seam + 0.0045, seam + 0.010])
        for a, b in zip(self.seams[:-1], self.seams[1:]):
            us.add((a + b) / 2)
        us = sorted(us)
        rows = [self.row_s(u) for u in us]
        nx, ny = len(us), len(rows[0])
        verts, faces = [], []
        for j in range(ny):
            for i, u in enumerate(us):
                verts.append(tuple(self.point(u, rows[i][j])))
        for j in range(ny - 1):
            for i in range(nx - 1):
                a = j * nx + i
                faces.append((a, a + 1, a + 1 + nx, a + nx))
        # The smooth hidden backing needs fewer crosswise samples than the
        # stitched front. Preserve every perimeter vertex for a closed shell.
        bottom_rows, bottom_map = [], {}
        sparse_columns = sorted(set([0, nx - 1] + list(range(1, nx - 1, 7))))
        for j in range(ny):
            columns = list(range(nx)) if j in [0, ny - 1] else sparse_columns
            bottom_row = []
            for i in columns:
                index = len(verts)
                verts.append(tuple(self.point(us[i], rows[i][j], True)))
                bottom_map[j * nx + i] = index
                bottom_row.append((i, index))
            bottom_rows.append(bottom_row)
        for arow, brow in zip(bottom_rows[:-1], bottom_rows[1:]):
            a = b = 0
            while a < len(arow) - 1 or b < len(brow) - 1:
                anext = arow[a + 1][0] if a < len(arow) - 1 else nx + 1
                bnext = brow[b + 1][0] if b < len(brow) - 1 else nx + 1
                if anext == bnext:
                    face = (arow[a][1], arow[a+1][1], brow[b+1][1], brow[b][1])
                    a += 1
                    b += 1
                elif anext < bnext:
                    face = (arow[a][1], arow[a+1][1], brow[b][1])
                    a += 1
                else:
                    face = (arow[a][1], brow[b+1][1], brow[b][1])
                    b += 1
                faces.append(tuple(reversed(face)))
        boundary = list(range(nx))
        boundary += [j * nx + nx - 1 for j in range(1, ny)]
        boundary += [(ny - 1) * nx + i for i in range(nx - 2, -1, -1)]
        boundary += [j * nx for j in range(ny - 2, 0, -1)]
        previous = boundary
        for t in [0.25, 0.5, 0.75, 1.0]:
            current = []
            for index in boundary:
                j, i = divmod(index, nx)
                u, s = us[i], rows[i][j]
                front, back = Vector(verts[index]), Vector(verts[bottom_map[index]])
                _, _, tangent = self.spine(s)
                outward = Vector((u if i in [0, nx-1] else 0, 0, 0))
                if j == 0:
                    outward -= tangent
                elif j == ny - 1:
                    outward += tangent
                if outward.length:
                    outward.normalize()
                point = front.lerp(back, t) + outward * 0.0034 * math.sin(math.pi * t)
                if t == 1:
                    current.append(bottom_map[index])
                else:
                    current.append(len(verts))
                    verts.append(tuple(point))
            for k in range(len(boundary)):
                nex = (k + 1) % len(boundary)
                faces.append((previous[k], current[k], current[nex], previous[nex]))
            previous = current
        shell = _mesh("Upholstery_continuous_padded_seat_and_back", verts, faces, mats["leather"], root)
        shell["construction"] = "Closed upholstered shell; rounded perimeter boxing; continuous lumbar bend"
        shell["panel_channels"] = self.nchannels

        # Fine sewn tracks lie inside the modeled depressions, not above a flat slab.
        seam_verts, seam_faces = [], []
        for u in self.seams:
            low, high = self.panel_limits(u)
            count = 79
            start = len(seam_verts)
            for j in range(count):
                s = low + (high - low) * j / (count - 1)
                du = 0.00042 / self.halfwidth(s)
                seam_verts += [tuple(self.point(u - du, s, extra=0.000075)), tuple(self.point(u + du, s, extra=0.000075))]
            for j in range(count - 1):
                a = start + j * 2
                seam_faces.append((a, a+1, a+3, a+2))
        _mesh("Fine_vertical_channel_stitch_tracks", seam_verts, seam_faces, mats["trim"], root)
        for which, title in [(0, "Seat_panel_curved_front_seam"), (1, "Back_panel_scalloped_crown_seam")]:
            points = []
            for i in range(161):
                u = -0.885 + 1.77 * i / 160
                s = self.panel_limits(u)[which]
                points.append(self.point(u, s, extra=0.00009))
            _sweep(title, points, 0.00024, mats["trim"], root, sides=5)
        welt_points = []
        for index in boundary:
            j, i = divmod(index, nx)
            u, s = us[i], rows[i][j]
            front, back = self.point(u, s), self.point(u, s, True)
            _, _, tangent = self.spine(s)
            outward = Vector((u if i in [0, nx-1] else 0, 0, 0))
            if j == 0:
                outward -= tangent
            elif j == ny - 1:
                outward += tangent
            if outward.length:
                outward.normalize()
            welt_points.append(front.lerp(back, 0.67) + outward * 0.00325)
        _sweep("Perimeter_fine_leather_welt", welt_points, 0.00066, mats["trim"], root, sides=6, closed=True)
        return shell


def build(params=None):
    p = {key: value[0] for key, value in PARAMS.items()}
    if params:
        for key, value in params.items():
            if key not in PARAMS:
                raise ValueError("Unknown parameter: " + key)
            value = float(value)
            if not math.isfinite(value) or not PARAMS[key][1] <= value <= PARAMS[key][2]:
                raise ValueError("Parameter outside bounded range: " + key)
            p[key] = value
    old = bpy.data.objects.get(ROOT_NAME)
    if old:
        if old.get("asset_id") != ASSET_ID:
            raise RuntimeError("Refusing to replace an unrelated object named " + ROOT_NAME)
        old_data = []
        for ob in list(old.children_recursive) + [old]:
            if ob.type == "MESH":
                old_data.append(ob.data)
            bpy.data.objects.remove(ob, do_unlink=True)
        for mesh in old_data:
            if mesh.users == 0:
                bpy.data.meshes.remove(mesh)
    root = bpy.data.objects.new(ROOT_NAME, None)
    bpy.context.scene.collection.objects.link(root)
    root["asset_id"] = ASSET_ID
    root["origin"] = "Floor centre; +Z up; -Y front"
    root["parameters"] = json.dumps(p, sort_keys=True)
    root.empty_display_type = "PLAIN_AXES"
    root.empty_display_size = 0.12
    bpy.context.scene.unit_settings.system = "METRIC"
    bpy.context.scene.unit_settings.scale_length = 1.0
    mats = _materials()
    pad = Upholstery(p)
    pad.create(root, mats)

    w, d, h, diameter = p["seat_width"], p["seat_depth"], p["seat_height"], p["tube_diameter"]
    side_x = w * 0.5 + 0.002
    back_x = w * 0.456 + 0.008
    floor_front, floor_back = -d * 0.565, d * 0.565
    top_s = pad.length - 0.045
    point, norm, _ = pad.spine(top_s)
    rail_top = point - norm * 0.022
    rail_seat_z = h - 0.052
    rail_rear_y = pad.y1 + (rail_seat_z + 0.006 - pad.z1) / math.tan(pad.theta1) + 0.022
    points = [
        (-back_x, rail_top.y, rail_top.z),
        (-back_x, rail_rear_y, rail_seat_z + 0.006),
        (-side_x, floor_front + 0.005, rail_seat_z),
        (-side_x, floor_front, 0.0235),
        (-side_x, floor_back, 0.0235),
        (side_x, floor_back, 0.0235),
        (side_x, floor_front, 0.0235),
        (side_x, floor_front + 0.005, rail_seat_z),
        (back_x, rail_rear_y, rail_seat_z + 0.006),
        (back_x, rail_top.y, rail_top.z),
    ]
    path = _filleted_path(points, [0.047, 0.046, 0.034, 0.024, 0.024, 0.034, 0.046, 0.047])
    frame = _sweep("Frame_ONE_continuous_hollow_bent_steel_tube", path, diameter / 2, mats["metal"], root, sides=20, wall=0.0018)
    frame["construction"] = "Single continuous sweep: back rails > seat supports > front risers > U-shaped floor sled. No rear legs."
    frame["wall_thickness_m"] = 0.0018
    for end, sign in [(0, -1), (-1, 1)]:
        tangent = (path[1] - path[0]).normalized() if end == 0 else (path[-1] - path[-2]).normalized()
        tip = path[end]
        _sweep("Back_rail_flush_end_plug_" + str(end), [tip - tangent * sign * 0.006, tip + tangent * sign * 0.0008], diameter * 0.5 - 0.0016, mats["rubber"], root, sides=20)
    for side in [-1, 1]:
        # Short, open-bottom glide shoes beneath the bends, not added legs.
        for y, label in [(floor_front + 0.029, "front"), (floor_back - 0.027, "rear")]:
            glide_h = 0.016 if label == "front" else 0.014
            glide_d = 0.034 if label == "front" else 0.024
            _rounded_block("Floor_glide_" + label + "_" + str(side), (side*side_x, y, glide_h/2), (diameter + 0.006, glide_d, glide_h), 0.0025, mats["rubber"], root)
        for y, label in [(-0.14 * d / 0.48, "front"), (0.09 * d / 0.48, "rear")]:
            x = side * (side_x - 0.027)
            _rounded_block("Underseat_saddle_bracket_" + label + "_" + str(side), (x, y, rail_seat_z + 0.011), (0.026, 0.038, 0.012), 0.003, mats["metal"], root)
            _sweep("Recessed_mount_fastener_" + label + "_" + str(side), [(x, y, rail_seat_z + 0.003), (x, y, rail_seat_z + 0.001)], 0.0044, mats["metal"], root, sides=12)
    # Two discreet rear mounting straps, inset into the upholstery backing.
    for z, label in [(h + 0.10, "lower"), (pad.top_z - 0.10, "upper")]:
        s = pad.arc_end + (z - pad.z1) / math.sin(pad.theta1)
        pos, normal, _ = pad.spine(s)
        pos -= normal * 0.024
        for side in [-1, 1]:
            _rounded_block("Back_mount_strap_" + label + "_" + str(side), (side * (back_x - 0.012), pos.y, z), (0.040, 0.011, 0.020), 0.002, mats["metal"], root)

    for name, location in [("floor", (0, 0, 0)), ("seat", (0, -0.065, h)), ("top", (0, pad.spine(pad.length)[0].y, pad.top_z))]:
        socket = bpy.data.objects.new("socket:" + name, None)
        bpy.context.scene.collection.objects.link(socket)
        socket.parent = root
        socket.location = location
        socket.empty_display_size = 0.035
        socket["vocabulary"] = name
    bpy.context.view_layer.update()
    return root


def _look_at(ob, target):
    ob.rotation_euler = (Vector(target) - ob.location).to_track_quat("-Z", "Y").to_euler()


def setup_studio(root):
    scene = bpy.context.scene
    # The CLI owns only its studio helpers, never arbitrary user objects.
    for ob in list(bpy.data.objects):
        if ob.get("chair_preview_stage"):
            bpy.data.objects.remove(ob, do_unlink=True)
    target = Vector((0, 0.005, 0.340))
    cd = bpy.data.cameras.new("Chair_hero_camera")
    cam = bpy.data.objects.new("Chair_hero_camera", cd)
    scene.collection.objects.link(cam)
    cam["chair_preview_stage"] = True
    cam.location = target + Vector((-1.65, -2.32, 0.620))
    _look_at(cam, target)
    cd.type = "PERSP"
    cd.ortho_scale = 1.13
    cd.lens = 90
    scene.camera = cam
    lights = [
        ("large_upper_left", (-2.3, -3.0, 3.6), 310, 2.5, (1.0, 0.97, 0.93)),
        ("soft_front_right", (2.6, -2.4, 1.8), 200, 2.2, (0.91, 0.95, 1.0)),
        ("rear_edge", (-2.0, 1.5, 3.2), 150, 1.6, (1.0, 0.97, 0.93)),
        ("long_left_reflection", (-2.1, 0.8, 1.6), 65, 1.4, (0.95, 0.97, 1.0)),
    ]
    for label, position, power, size, color in lights:
        ld = bpy.data.lights.new("Chair_light_" + label, "AREA")
        ld.energy, ld.shape, ld.size, ld.color = power, "DISK", size, color
        ob = bpy.data.objects.new("Chair_light_" + label, ld)
        scene.collection.objects.link(ob)
        ob["chair_preview_stage"] = True
        ob.location = position
        _look_at(ob, (0, 0, 0.43))
    world = bpy.data.worlds.new("Chair_black_studio")
    world.use_nodes = True
    nodes, links = world.node_tree.nodes, world.node_tree.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputWorld")
    ambient = nodes.new("ShaderNodeBackground")
    ambient.inputs["Color"].default_value = (0.23, 0.25, 0.28, 1)
    ambient.inputs["Strength"].default_value = 0.33
    backdrop = nodes.new("ShaderNodeBackground")
    backdrop.inputs["Color"].default_value = (0.0005, 0.0007, 0.0006, 1)
    path = nodes.new("ShaderNodeLightPath")
    mix = nodes.new("ShaderNodeMixShader")
    links.new(path.outputs["Is Camera Ray"], mix.inputs[0])
    links.new(ambient.outputs[0], mix.inputs[1])
    links.new(backdrop.outputs[0], mix.inputs[2])
    links.new(mix.outputs[0], out.inputs[0])
    scene.world = world
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 64
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 1024
    scene.render.resolution_y = 1024
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = False
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.render.image_settings.color_depth = "8"
    return cam


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for key, descriptor in PARAMS.items():
        parser.add_argument("--" + key, type=float, default=descriptor[0], help=descriptor[3])
    parser.add_argument("--output", required=True)
    parser.add_argument("--preview")
    parser.add_argument("--rear-preview")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])
    root = build({key: getattr(args, key) for key in PARAMS})
    # Factory-startup camera, light and cube are stage contents; hide for rendering.
    owned = {root, *root.children_recursive}
    for ob in bpy.context.scene.objects:
        if ob not in owned:
            ob.hide_render = True
            ob.hide_set(True)
    camera = setup_studio(root)
    scene = bpy.context.scene
    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)
    bpy.context.view_layer.objects.active = root
    output = Path(args.output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    if args.preview:
        preview = Path(args.preview).resolve()
        preview.parent.mkdir(parents=True, exist_ok=True)
        scene.render.filepath = str(preview)
    bpy.ops.wm.save_as_mainfile(filepath=str(output), compress=True)
    if args.preview:
        bpy.ops.render.render(write_still=True)
    if args.rear_preview:
        rear = Path(args.rear_preview).resolve()
        rear.parent.mkdir(parents=True, exist_ok=True)
        camera.location = Vector((1.6, 2.4, 1.25))
        _look_at(camera, (0, 0, 0.42))
        scene.render.resolution_x = scene.render.resolution_y = 768
        scene.render.filepath = str(rear)
        bpy.ops.render.render(write_still=True)


if __name__ == "__main__":
    main()
