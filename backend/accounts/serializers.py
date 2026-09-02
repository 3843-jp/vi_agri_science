from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User, Role, Permission


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ["id", "codename", "description"]


class RoleSerializer(serializers.ModelSerializer):
    permissions = PermissionSerializer(many=True, read_only=True)
    permission_codes = serializers.ListField(
        child=serializers.CharField(), write_only=True, required=False,
        help_text="List of permission codenames to assign to this role.",
    )

    class Meta:
        model = Role
        fields = ["id", "name", "description", "is_system_role", "permissions", "permission_codes"]
        read_only_fields = ["is_system_role"]

    def create(self, validated_data):
        codes = validated_data.pop("permission_codes", [])
        role = Role.objects.create(**validated_data)
        if codes:
            perms = Permission.objects.filter(codename__in=codes)
            role.permissions.set(perms)
        return role

    def update(self, instance, validated_data):
        codes = validated_data.pop("permission_codes", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if codes is not None:
            perms = Permission.objects.filter(codename__in=codes)
            instance.permissions.set(perms)
        return instance


class UserSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source="role.name", read_only=True)
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id", "username", "email", "first_name", "last_name",
            "phone", "role", "role_name", "is_active", "is_active_employee",
            "is_superuser", "permissions", "date_joined", "last_login",
        ]
        read_only_fields = ["id", "date_joined", "last_login", "is_superuser", "is_active"]

    def get_permissions(self, obj):
        if obj.is_superuser:
            from .models import Permission as PermModel
            return list(PermModel.objects.values_list("codename", flat=True))
        if not obj.role:
            return []
        return list(obj.role.permissions.values_list("codename", flat=True))


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "phone", "role", "password"]

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)  # Django's secure hashing — never plain text
        user.save()
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Adds role/permission info directly into the token response so the
    frontend can render the correct UI immediately after login without a
    second round trip — while the backend still re-checks permissions on
    every subsequent request."""

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data
