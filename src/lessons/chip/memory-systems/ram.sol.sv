module ram(
  input        clk, write_en,
  input  [3:0] addr,
  input  [7:0] data_in,
  output reg [7:0] data_out
);
  reg [7:0] mem [0:15];

  always @(posedge clk) begin
    if (write_en)
      mem[addr] <= data_in;
    data_out <= mem[addr];
  end
endmodule
