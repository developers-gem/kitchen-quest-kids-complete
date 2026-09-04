class Organization {
  const Organization({required this.id, required this.type, this.familyName, required this.primaryParent});

  final String id;
  final String type; // "family" | "school"
  final String? familyName;
  final String primaryParent;

  factory Organization.fromJson(Map<String, dynamic> json) {
    return Organization(
      id: json['_id'] as String,
      type: json['type'] as String,
      familyName: json['familyName'] as String?,
      primaryParent: json['primaryParent'] as String,
    );
  }
}
