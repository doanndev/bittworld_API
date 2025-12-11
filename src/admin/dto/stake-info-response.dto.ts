import { ApiProperty } from '@nestjs/swagger';

export class StakeInfoDto {
  @ApiProperty({ description: 'ID của pool join record' })
  apj_id: number;

  @ApiProperty({ description: 'ID của pool' })
  apj_pool_id: number;

  @ApiProperty({ description: 'ID của ví thành viên' })
  apj_member: number;

  @ApiProperty({ description: 'Số lượng token stake' })
  apj_volume: number;

  @ApiProperty({ description: 'Ngày stake' })
  apj_stake_date: Date;

  @ApiProperty({ description: 'Ngày kết thúc stake', nullable: true })
  apj_stake_end: Date | null;

  @ApiProperty({ description: 'Ngày kết thúc round', nullable: true })
  apj_round_end: Date | null;

  @ApiProperty({ description: 'Trạng thái stake' })
  apj_status: string;

  @ApiProperty({ description: 'Transaction hash', nullable: true })
  apj_hash: string | null;

  @ApiProperty({ description: 'Thông tin pool' })
  pool: {
    alp_id: number;
    alp_name: string;
    alp_slug: string;
    alp_describe: string | null;
    alp_logo: string | null;
    alp_member_num: number;
    apl_volume: number;
    apl_creation_date: Date;
    apl_end_date: Date | null;
    apl_round_end: Date | null;
    apl_status: string;
    alp_originator: number;
    originator_info: {
      wallet_id: number;
      wallet_solana_address: string;
      wallet_eth_address: string;
      wallet_nick_name: string | null;
      bittworld_uid: string | null;
    };
  };

  @ApiProperty({ description: 'Thông tin ví thành viên' })
  member: {
    wallet_id: number;
    wallet_solana_address: string;
    wallet_eth_address: string;
    wallet_nick_name: string | null;
    bittworld_uid: string | null;
    isBittworld: boolean;
  };
}

export class StakeInfoResponseDto {
  @ApiProperty({ description: 'Thông tin ví/UID được tìm kiếm' })
  searchInfo: {
    type: 'uid' | 'wallet_id' | 'address';
    value: string;
    wallet_id: number;
    wallet_solana_address: string;
    wallet_eth_address: string;
    wallet_nick_name: string | null;
    bittworld_uid: string | null;
    isBittworld: boolean;
  };

  @ApiProperty({ description: 'Tổng số lượng stake records' })
  totalStakes: number;

  @ApiProperty({ description: 'Tổng volume stake' })
  totalVolume: number;

  @ApiProperty({ description: 'Số lượng pools đã tham gia' })
  totalPools: number;

  @ApiProperty({ description: 'Danh sách stake records' })
  stakes: StakeInfoDto[];

  @ApiProperty({ description: 'Thông tin phân trang' })
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
