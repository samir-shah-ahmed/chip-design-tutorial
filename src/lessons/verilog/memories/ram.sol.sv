module ram(
  input clk,
  input we,
  input [2:0] addr,
  input [3:0] wdata,
  output reg [3:0] rdata
);
  reg [3:0] mem [0:7];
  always @(posedge clk) begin
    if (we)
      mem[addr] <= wdata;
    rdata <= mem[addr];
  end
endmodule
